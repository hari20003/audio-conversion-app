import React, { useMemo, useState } from "react";
import API from "../api/api";

function AudioToScriptPage() {
  const [files, setFiles] = useState([]);
  const [language, setLanguage] = useState("ta");
  const [projectName, setProjectName] = useState("");
  const [datasetName, setDatasetName] = useState("");

  const [processing, setProcessing] = useState(false);
  const [progressList, setProgressList] = useState([]);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState("");

  const [tableRows, setTableRows] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewJson, setPreviewJson] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [editJsonText, setEditJsonText] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTableRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tableRows;

    return tableRows.filter((row) =>
      (row.file_name || "").toLowerCase().includes(q)
    );
  }, [tableRows, searchTerm]);

  const fetchTableData = async () => {
    try {
      const response = await API.get(
        `/transcription/files-by-language?language=${language}`
      );
      setTableRows(response.data.files || []);
    } catch (err) {
      console.error("Failed to load table data", err);
    }
  };
  const downloadJsonFile = (fileName, jsonData) => {
  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  const baseName = fileName.includes(".")
    ? fileName.substring(0, fileName.lastIndexOf("."))
    : fileName;

  a.href = url;
  a.download = `${baseName}_output.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  window.URL.revokeObjectURL(url);
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const handleProcessFiles = async (e) => {
    e.preventDefault();

    if (!files || files.length === 0) {
      setError("Please select one or more audio files.");
      return;
    }

    setProcessing(true);
    setError("");
    setSummaryMessage("");
    setLastResult(null);
    setUploadMessage("");
    setPreviewJson(null);
    setPreviewFileName("");
    setEditJsonText("");

    const initialList = Array.from(files).map((file) => ({
      fileName: file.name,
      status: "waiting",
      message: "Waiting...",
    }));

    setProgressList(initialList);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];

      setProgressList((prev) =>
        prev.map((item, index) =>
          index === i
            ? {
                ...item,
                status: "processing",
                message: `${currentFile.name} is processing...`,
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

      const response = await API.post("/transcription/process-audio", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      successCount += 1;
      setLastResult(response.data);

      if (response.data?.output_json) {
        downloadJsonFile(currentFile.name, response.data.output_json);
        await pause(300);
      }

        setProgressList((prev) =>
          prev.map((item, index) =>
            index === i
              ? {
                  ...item,
                  status: "done",
                  message: `${currentFile.name} completed successfully`,
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
                    err.response?.data?.detail ||
                    `${currentFile.name} failed during processing`,
                }
              : item
          )
        );
      }
    }

    setProcessing(false);

    if (failedCount === 0) {
      setSummaryMessage(`All ${successCount} file(s) completed successfully.`);
    } else {
      setSummaryMessage(
        `${successCount} file(s) completed successfully and ${failedCount} file(s) failed.`
      );
    }

    fetchTableData();
  };

  const handlePreviewJson = async (fileName) => {
    try {
      const response = await API.get(
        `/transcription/json/${encodeURIComponent(fileName)}?language=${language}`
      );

      setPreviewJson(response.data.json_data);
      setPreviewFileName(fileName);
      setEditJsonText(JSON.stringify(response.data.json_data, null, 2));
    } catch (err) {
      alert("Failed to load JSON preview.");
    }
  };

  const handleSaveJson = async () => {
    try {
      const parsedJson = JSON.parse(editJsonText);

      await API.put(
        `/transcription/json/${encodeURIComponent(previewFileName)}?language=${language}`,
        parsedJson,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setPreviewJson(parsedJson);
      alert("JSON updated successfully");
      fetchTableData();
    } catch (err) {
      alert("Invalid JSON or update failed.");
    }
  };

  const handleSelectFile = (fileName) => {
    setSelectedFiles((prev) =>
      prev.includes(fileName)
        ? prev.filter((f) => f !== fileName)
        : [...prev, fileName]
    );
  };

  const handleBulkUploadToDataloop = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file.");
      return;
    }

    try {
      const response = await API.post("/dataloop/bulk-upload", {
        language,
        file_names: selectedFiles,
        project_name: projectName || null,
        dataset_name: datasetName || null,
      });

      setUploadMessage(response.data.message || "Bulk upload completed");
      fetchTableData();
    } catch (err) {
      alert(err.response?.data?.detail || "Bulk upload failed");
    }
  };

  const getStatusStyle = (status) => {
    if (status === "done") {
      return {
        color: "#15803d",
        background: "#dcfce7",
        border: "1px solid #86efac",
      };
    }

    if (status === "processing") {
      return {
        color: "#b45309",
        background: "#fef3c7",
        border: "1px solid #fcd34d",
      };
    }

    if (status === "failed") {
      return {
        color: "#b91c1c",
        background: "#fee2e2",
        border: "1px solid #fca5a5",
      };
    }

    return {
      color: "#4b5563",
      background: "#f3f4f6",
      border: "1px solid #d1d5db",
    };
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <h2>Convert Audio to Script</h2>
      <p>Upload one or more audio files, process them to JSON, monitor status, preview JSON, and upload selected files to Dataloop.</p>

      {/* Single unified upload + processing section */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "24px",
          marginTop: "24px",
          background: "#fff",
        }}
      >
        <h3>Upload Audio Files</h3>
        <p>Select one file or multiple files. All processing status will be shown below.</p>

        <form onSubmit={handleProcessFiles} style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
          <div>
            <label>Project Name</label>
            <br />
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{ width: "100%", padding: "10px" }}
            />
          </div>

          <div>
            <label>Dataset Name</label>
            <br />
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              style={{ width: "100%", padding: "10px" }}
            />
          </div>

          <div>
            <label>Language</label>
            <br />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ width: "100%", padding: "10px" }}
            >
              <option value="ta">Tamil</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </div>

          <div>
            <label>Audio Files</label>
            <br />
            <input
              type="file"
              multiple
              accept=".mp3,.wav,.m4a,.flac,.aac,.ogg"
              onChange={(e) => setFiles(e.target.files)}
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            style={{
              padding: "12px 20px",
              background: "#111827",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              width: "260px",
            }}
          >
            {processing ? "Processing Files..." : "Upload and Convert to JSON"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: "20px", color: "red" }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {summaryMessage && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#ecfdf5",
              color: "#166534",
              border: "1px solid #86efac",
              fontWeight: "600",
            }}
          >
            {summaryMessage}
          </div>
        )}

        {progressList.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <h4>Processing Status</h4>
            <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
              {progressList.map((item, index) => (
                <div
                  key={`${item.fileName}-${index}`}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    ...getStatusStyle(item.status),
                  }}
                >
                  <div style={{ fontWeight: "700" }}>{item.fileName}</div>
                  <div style={{ marginTop: "4px", textTransform: "capitalize" }}>
                    {item.status}
                  </div>
                  <div style={{ marginTop: "4px" }}>{item.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastResult && (
          <div style={{ marginTop: "30px" }}>
            <h4>Last Converted File Preview</h4>
            <p><strong>Audio File:</strong> {lastResult.audio_file_name}</p>
            <p><strong>Output JSON Path:</strong> {lastResult.transcript_json_path}</p>
            <p><strong>Segments:</strong> {lastResult.annotations_count}</p>

            <pre
              style={{
                background: "#f4f4f4",
                padding: "16px",
                borderRadius: "8px",
                overflowX: "auto",
                maxHeight: "400px",
              }}
            >
              {JSON.stringify(lastResult.output_json, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Table section */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "24px",
          marginTop: "32px",
          background: "#fff",
        }}
      >
        <h3>Processed Audio JSON Table</h3>
        <p>Search files, preview JSON, edit JSON, and upload selected files to Dataloop.</p>

        <div style={{ marginTop: "16px", marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Search file name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <button
            onClick={fetchTableData}
            style={{
              padding: "10px 16px",
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Load Table
          </button>

          <button
            onClick={handleBulkUploadToDataloop}
            disabled={selectedFiles.length === 0}
            style={{
              padding: "10px 16px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Bulk Upload to Dataloop
          </button>
        </div>

        {uploadMessage && (
          <p style={{ color: "green", marginBottom: "16px" }}>{uploadMessage}</p>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ border: "1px solid #ddd", padding: "10px" }}>Select</th>
                <th style={{ border: "1px solid #ddd", padding: "10px" }}>File Name</th>
                <th style={{ border: "1px solid #ddd", padding: "10px" }}>Project</th>
                <th style={{ border: "1px solid #ddd", padding: "10px" }}>Dataset</th>
                <th style={{ border: "1px solid #ddd", padding: "10px" }}>Status</th>
                <th style={{ border: "1px solid #ddd", padding: "10px" }}>Preview</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableRows.length > 0 ? (
                filteredTableRows.map((row) => (
                  <tr key={row.file_name}>
                    <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(row.file_name)}
                        onChange={() => handleSelectFile(row.file_name)}
                      />
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.file_name}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.project_name}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.dataset_name}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>{row.dataloop_status}</td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      <button onClick={() => handlePreviewJson(row.file_name)}>
                        Preview / Edit JSON
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ border: "1px solid #ddd", padding: "16px", textAlign: "center" }}>
                    No files found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON preview edit */}
      {previewJson && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "24px",
            marginTop: "32px",
            background: "#fff",
          }}
        >
          <h3>JSON Preview / Edit</h3>
          <p><strong>File Name:</strong> {previewFileName}</p>

          <textarea
            value={editJsonText}
            onChange={(e) => setEditJsonText(e.target.value)}
            rows={20}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              marginTop: "12px",
            }}
          />

          <button
            onClick={handleSaveJson}
            style={{
              marginTop: "16px",
              padding: "12px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Save JSON
          </button>
        </div>
      )}
    </div>
  );
}

export default AudioToScriptPage;