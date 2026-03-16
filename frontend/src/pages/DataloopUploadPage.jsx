import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../App.css";

function DataloopUploadPage() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState("ta");
  const [projectName, setProjectName] = useState("");
  const [datasetName, setDatasetName] = useState("");

  // DB files section
  const [tableRows, setTableRows] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingDbFiles, setLoadingDbFiles] = useState(false);

  // Local files section
  const [localFiles, setLocalFiles] = useState([]);

  // Upload progress
  const [uploading, setUploading] = useState(false);
  const [progressList, setProgressList] = useState([]);
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tableRows;

    return tableRows.filter((row) =>
      (row.file_name || "").toLowerCase().includes(q)
    );
  }, [tableRows, searchTerm]);

  const fetchDbFiles = async () => {
    setLoadingDbFiles(true);
    setError("");
    setMessage("");

    try {
      const response = await API.get(
        `/transcription/files-by-language?language=${language}`
      );
      setTableRows(response.data.files || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load database files.");
    } finally {
      setLoadingDbFiles(false);
    }
  };

  const handleSelectFile = (fileName) => {
    setSelectedFiles((prev) =>
      prev.includes(fileName)
        ? prev.filter((f) => f !== fileName)
        : [...prev, fileName]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleNames = filteredRows.map((row) => row.file_name);
    const allSelected = visibleNames.every((name) => selectedFiles.includes(name));

    if (allSelected) {
      setSelectedFiles((prev) => prev.filter((name) => !visibleNames.includes(name)));
    } else {
      setSelectedFiles((prev) => [...new Set([...prev, ...visibleNames])]);
    }
  };

  const getStatusClass = (status) => {
    if (status === "done") return "status-card status-done";
    if (status === "processing") return "status-card status-processing";
    if (status === "failed") return "status-card status-failed";
    return "status-card status-waiting";
  };

  // Upload DB-selected files one by one
  const handleUploadSelectedDbFiles = async () => {
    if (!projectName || !datasetName) {
      setError("Please enter project name and dataset name.");
      return;
    }

    if (selectedFiles.length === 0) {
      setError("Please select at least one database file.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    setSummary("");

    const initialProgress = selectedFiles.map((fileName) => ({
      fileName,
      status: "waiting",
      message: "Waiting to start",
    }));
    setProgressList(initialProgress);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const currentFile = selectedFiles[i];

      setProgressList((prev) =>
        prev.map((item, index) =>
          index === i
            ? {
                ...item,
                status: "processing",
                message: `${currentFile} is uploading...`,
              }
            : item
        )
      );

      try {
        await API.post("/dataloop/bulk-upload", {
          language,
          file_names: [currentFile],
          project_name: projectName,
          dataset_name: datasetName,
        });

        successCount += 1;

        setProgressList((prev) =>
          prev.map((item, index) =>
            index === i
              ? {
                  ...item,
                  status: "done",
                  message: `${currentFile} uploaded successfully`,
                }
              : item
          )
        );
      } catch (err) {
        failedCount += 1;

        setProgressList((prev) =>
          prev.map((item, index) =>
            index === i
              ? {
                  ...item,
                  status: "failed",
                  message:
                    err.response?.data?.detail || `${currentFile} upload failed`,
                }
              : item
          )
        );
      }
    }

    setUploading(false);
    setMessage("Database file upload completed.");
    setSummary(
      `Total Files: ${selectedFiles.length} | Successful: ${successCount} | Failed: ${failedCount}`
    );
    fetchDbFiles();
  };

  // Upload local-drive files one by one
  const handleUploadLocalFiles = async () => {
    if (!projectName || !datasetName) {
      setError("Please enter project name and dataset name.");
      return;
    }

    if (!localFiles || localFiles.length === 0) {
      setError("Please choose local files first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    setSummary("");

    const localArray = Array.from(localFiles);

    const initialProgress = localArray.map((file) => ({
      fileName: file.name,
      status: "waiting",
      message: "Waiting to start",
    }));
    setProgressList(initialProgress);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < localArray.length; i++) {
      const currentFile = localArray[i];

      setProgressList((prev) =>
        prev.map((item, index) =>
          index === i
            ? {
                ...item,
                status: "processing",
                message: `${currentFile.name} is uploading...`,
              }
            : item
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", currentFile);
        formData.append("language", language);
        formData.append("project_name", projectName);
        formData.append("dataset_name", datasetName);

        await API.post("/dataloop/upload-local-file", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        successCount += 1;

        setProgressList((prev) =>
          prev.map((item, index) =>
            index === i
              ? {
                  ...item,
                  status: "done",
                  message: `${currentFile.name} uploaded successfully`,
                }
              : item
          )
        );
      } catch (err) {
        failedCount += 1;

        setProgressList((prev) =>
          prev.map((item, index) =>
            index === i
              ? {
                  ...item,
                  status: "failed",
                  message:
                    err.response?.data?.detail || `${currentFile.name} upload failed`,
                }
              : item
          )
        );
      }
    }

    setUploading(false);
    setMessage("Local file upload completed.");
    setSummary(
      `Total Files: ${localArray.length} | Successful: ${successCount} | Failed: ${failedCount}`
    );
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dataloop Bulk Upload</h1>
          <p className="page-text">
            Upload files to Dataloop from the database or directly from your local drive,
            with project and dataset selection plus per-file live status.
          </p>
        </div>

        <div className="page-card">
          <h3 style={{ marginTop: 0 }}>Upload Settings</h3>

          <div className="form-grid" style={{ marginTop: 16 }}>
            <div>
              <label className="form-label">Language</label>
              <select
                className="select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="ta">Tamil</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div>
              <label className="form-label">Project Name</label>
              <input
                className="input"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter Dataloop project name"
              />
            </div>

            <div>
              <label className="form-label">Dataset Name</label>
              <input
                className="input"
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Enter Dataloop dataset name"
              />
            </div>
          </div>

          <div className="toolbar">
            <button className="secondary-btn" onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>

          {error && <div className="message-error">{error}</div>}
          {message && <div className="message-success">{message}</div>}
          {summary && <div className="message-success">{summary}</div>}
        </div>

        <div className="page-card">
          <h3 style={{ marginTop: 0 }}>Upload from Database Files</h3>
          <p className="page-text" style={{ marginTop: 8 }}>
            Load processed files from the database, select the ones you want, and upload them.
          </p>

          <div className="toolbar">
            <button className="primary-btn" onClick={fetchDbFiles} disabled={loadingDbFiles}>
              {loadingDbFiles ? "Loading..." : "Load Database Files"}
            </button>

            <button className="secondary-btn" onClick={handleSelectAllVisible}>
              Select / Unselect Visible
            </button>

            <button
              className="primary-btn"
              onClick={handleUploadSelectedDbFiles}
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? "Uploading..." : "Upload Selected DB Files"}
            </button>
          </div>

          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <input
              className="input"
              type="text"
              placeholder="Search file name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table className="lux-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>File Name</th>
                  <th>Project</th>
                  <th>Dataset</th>
                  <th>Processing</th>
                  <th>Dataloop</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr key={row.file_name}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(row.file_name)}
                          onChange={() => handleSelectFile(row.file_name)}
                        />
                      </td>
                      <td>{row.file_name}</td>
                      <td>{row.project_name}</td>
                      <td>{row.dataset_name}</td>
                      <td>{row.processing_status}</td>
                      <td>{row.dataloop_status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "18px" }}>
                      No files found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, color: "#475569", fontWeight: 600 }}>
            Selected database files: {selectedFiles.length}
          </div>
        </div>

        <div className="page-card">
          <h3 style={{ marginTop: 0 }}>Upload from Local Drive</h3>
          <p className="page-text" style={{ marginTop: 8 }}>
            Choose files directly from your computer and upload them to Dataloop.
          </p>

          <div className="form-grid" style={{ marginTop: 16 }}>
            <div>
              <label className="form-label">Local Files</label>
              <input
                className="file-input"
                type="file"
                multiple
                onChange={(e) => setLocalFiles(e.target.files)}
              />
            </div>
          </div>

          <div className="toolbar">
            <button
              className="primary-btn"
              onClick={handleUploadLocalFiles}
              disabled={uploading || !localFiles || localFiles.length === 0}
            >
              {uploading ? "Uploading..." : "Upload Local Files"}
            </button>
          </div>

          <div style={{ marginTop: 14, color: "#475569", fontWeight: 600 }}>
            Selected local files: {localFiles?.length || 0}
          </div>
        </div>

        {progressList.length > 0 && (
          <div className="page-card">
            <h3 style={{ marginTop: 0 }}>Upload Progress</h3>

            <div className="status-stack" style={{ marginTop: 16 }}>
              {progressList.map((item, index) => (
                <div key={`${item.fileName}-${index}`} className={getStatusClass(item.status)}>
                  <div style={{ fontWeight: 800 }}>{item.fileName}</div>
                  <div style={{ marginTop: 6 }}>{item.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataloopUploadPage;