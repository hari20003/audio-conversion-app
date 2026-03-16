import React, { useState } from "react";
import API from "../api/api";

function ConversionTwoPage() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progressList, setProgressList] = useState([]);
  const [summary, setSummary] = useState("");
  const [outputFolderHandle, setOutputFolderHandle] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChooseFolder = async () => {
    try {
      setErrorMessage("");

      if (!window.showDirectoryPicker) {
        setErrorMessage("Folder saving is supported in Chrome or Edge.");
        return;
      }

      const dirHandle = await window.showDirectoryPicker();
      setOutputFolderHandle(dirHandle);
      setFolderName(dirHandle.name || "Selected Folder");
    } catch (err) {
      if (err?.name !== "AbortError") {
        setErrorMessage("Failed to select output folder.");
      }
    }
  };

  const saveJsonToSelectedFolder = async (fileName, jsonData) => {
    if (!outputFolderHandle) {
      throw new Error("No output folder selected");
    }

    const baseName = fileName.includes(".")
      ? fileName.substring(0, fileName.lastIndexOf("."))
      : fileName;

    const outputFileName = `${baseName}_converted.json`;

    const fileHandle = await outputFolderHandle.getFileHandle(outputFileName, {
      create: true,
    });

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(jsonData, null, 2));
    await writable.close();
  };

  const handleConvert = async (e) => {
    e.preventDefault();

    if (!files || files.length === 0) {
      setErrorMessage("Please select one or more JSON files.");
      return;
    }

    if (!outputFolderHandle) {
      setErrorMessage("Please choose an output folder first.");
      return;
    }

    setProcessing(true);
    setSummary("");
    setErrorMessage("");

    const initialProgress = Array.from(files).map((file) => ({
      fileName: file.name,
      status: "waiting",
      message: "Waiting to start",
    }));

    setProgressList(initialProgress);

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
                message: "Converting and saving...",
              }
            : item
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", currentFile);

        const response = await API.post("/conversion/convert-local-json", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (!response.data?.converted_json) {
          throw new Error("Converted JSON not returned from backend");
        }

        await saveJsonToSelectedFolder(currentFile.name, response.data.converted_json);

        successCount += 1;

        setProgressList((prev) =>
          prev.map((item, index) =>
            index === i
              ? {
                  ...item,
                  status: "done",
                  message: `Saved successfully to ${folderName}`,
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
                    err.message ||
                    "Conversion failed",
                }
              : item
          )
        );
      }
    }

    setProcessing(false);

    if (failedCount === 0) {
      setSummary(`All ${successCount} file(s) were converted and saved successfully.`);
    } else {
      setSummary(
        `${successCount} file(s) were saved successfully and ${failedCount} file(s) failed.`
      );
    }
  };

  const getCardStyle = (status) => {
    switch (status) {
      case "done":
        return {
          color: "#166534",
          background: "#dcfce7",
          border: "1px solid #86efac",
        };
      case "processing":
        return {
          color: "#92400e",
          background: "#fef3c7",
          border: "1px solid #fcd34d",
        };
      case "failed":
        return {
          color: "#991b1b",
          background: "#fee2e2",
          border: "1px solid #fca5a5",
        };
      default:
        return {
          color: "#334155",
          background: "#f8fafc",
          border: "1px solid #cbd5e1",
        };
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "32px 20px",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            Conversion Two
          </h1>
          <p
            style={{
              marginTop: "10px",
              color: "#475569",
              fontSize: "16px",
              lineHeight: "24px",
            }}
          >
            Select JSON files, convert them, and save the output directly into your chosen folder.
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#0f172a",
                }}
              >
                Step 1: Choose output folder
              </label>

              <button
                type="button"
                onClick={handleChooseFolder}
                style={{
                  padding: "12px 18px",
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Choose Folder
              </button>

              {folderName && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#166534",
                    border: "1px solid #86efac",
                    fontWeight: "600",
                  }}
                >
                  Output folder: {folderName}
                </div>
              )}
            </div>

            <form onSubmit={handleConvert}>
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#0f172a",
                  }}
                >
                  Step 2: Select JSON files
                </label>

                <input
                  type="file"
                  multiple
                  accept=".json"
                  onChange={(e) => setFiles(e.target.files)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={processing}
                style={{
                  padding: "12px 20px",
                  background: processing ? "#94a3b8" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: processing ? "not-allowed" : "pointer",
                  fontWeight: "600",
                }}
              >
                {processing ? "Converting..." : "Run Conversion Two"}
              </button>
            </form>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              fontWeight: "600",
            }}
          >
            {errorMessage}
          </div>
        )}

        {summary && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#ecfdf5",
              border: "1px solid #86efac",
              color: "#166534",
              fontWeight: "700",
            }}
          >
            {summary}
          </div>
        )}

        {progressList.length > 0 && (
          <div
            style={{
              marginTop: "24px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#0f172a",
                marginTop: 0,
                marginBottom: "16px",
              }}
            >
              Conversion Status
            </h2>

            <div style={{ display: "grid", gap: "12px" }}>
              {progressList.map((item, index) => (
                <div
                  key={`${item.fileName}-${index}`}
                  style={{
                    borderRadius: "12px",
                    padding: "14px 16px",
                    ...getCardStyle(item.status),
                  }}
                >
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "15px",
                    }}
                  >
                    {item.fileName}
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      textTransform: "capitalize",
                      fontWeight: "600",
                    }}
                  >
                    {item.status}
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "14px",
                    }}
                  >
                    {item.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversionTwoPage;