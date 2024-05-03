// eslint-disable-next-line no-unused-vars
import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Button,
  Container,
  TextField,
  Typography,
  InputAdornment,
  MenuItem,
  Select,
} from "@mui/material";

function App() {
  const [originalData, setOriginalData] = useState([]);
  const [overlayData, setOverlayData] = useState([]);
  const [previewText, setPreviewText] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [interval, setInterval] = useState(1); // Default interval: 1 detik
  const [intervalType, setIntervalType] = useState("second"); // Default interval type: detik

  const handleOriginalDataUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const result = Papa.parse(text, { header: true });
      setOriginalData(result.data);
    };
    reader.readAsText(file);
  };

  const handleOverlayDataUpload = (event) => {
    const files = event.target.files;
    let combinedData = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const overlayData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        overlayData.shift();
        combinedData = combinedData.concat(overlayData);
        setOverlayData(combinedData);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleOverlay = () => {
    const resultMap = new Map();
    originalData.forEach((row) => {
      resultMap.set(`${row.Lattitude},${row.Longitude}`, row);
    });
    overlayData.forEach((row) => {
      const key = `${row[1]},${row[2]}`;
      if (resultMap.has(key)) {
        const originalRow = resultMap.get(key);
        resultMap.set(key, {
          ...originalRow,
          Depth: row[4],
          Page: "Page 3", // Tambahkan penanda "Page 3" untuk baris yang ter-overlay
        });
      }
    });

    let resultValues = Array.from(resultMap.values());
    const startDate = new Date(`${date} ${time}`);
    const intervalSeconds =
      parseInt(interval) * (intervalType === "second" ? 1000 : 1);

    resultValues = resultValues.map((row, index) => ({
      ...row,
      Time: getEstimateTime(startDate, intervalSeconds, index),
    }));

    const resultValuesWithoutLast = resultValues.slice(0, -1);
    setPreviewText(
      `Lattitude,Longitude,Depth,Time,Page\n${resultValuesWithoutLast
        .map(
          (row) =>
            `${row.Lattitude},${row.Longitude},${row.Depth || ""},${
              row.Time || ""
            },${row.Page || ""}`
        )
        .join("\n")}`
    );
  };

  const getEstimateTime = (startDate, intervalSeconds, index) => {
    const milliseconds = intervalSeconds * index;
    const estimatedDate = new Date(startDate.getTime() + milliseconds);
    const formattedDate = estimatedDate.toLocaleString("en-US");
    return formattedDate.replace(",", "");
  };

  const handleDownloadCSV = () => {
    const csvContent = previewText;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "result_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewChange = (event) => {
    setPreviewText(event.target.value);
  };

  const handleDateChange = (event) => {
    setDate(event.target.value);
  };

  const handleTimeChange = (event) => {
    setTime(event.target.value);
  };

  const handleIntervalChange = (event) => {
    setInterval(event.target.value);
  };

  const handleIntervalTypeChange = (event) => {
    setIntervalType(event.target.value);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5, textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={handleDateChange}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={handleTimeChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 1 }}
          />
          <div style={{ position: "relative", width: "fit-content" }}>
            <TextField
              label="Interval"
              type="number"
              value={interval}
              onChange={handleIntervalChange}
              InputLabelProps={{ shrink: true }}
            />
            <Select
              value={intervalType}
              onChange={handleIntervalTypeChange}
              displayEmpty
              inputProps={{ "aria-label": "Without label" }}
              sx={{
                height: "50%",
                width: "50%",
                position: "absolute",
                top: "50%",
                right: "16%",
                transform: "translateY(-50%)",
              }}
            >
              <MenuItem value="second">Second</MenuItem>
              <MenuItem value="milisecond">Milisecond</MenuItem>
            </Select>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: "1rem",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <Typography variant="h5" gutterBottom>
              Raw Data (CSV)
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleOriginalDataUpload}
            />
            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              Page 3 (XLSX)
            </Typography>
            <input
              type="file"
              accept=".xlsx"
              multiple
              onChange={handleOverlayDataUpload}
            />
          </div>
          <div>
            <Button variant="contained" onClick={handleOverlay} sx={{}}>
              Override
            </Button>
            <Button
              variant="contained"
              onClick={handleDownloadCSV}
              sx={{ ml: 3 }}
            >
              Download
            </Button>
          </div>
        </div>
      </div>
      <Typography variant="h5">Preview</Typography>
      <TextField
        multiline
        rows={20}
        fullWidth
        value={previewText}
        onChange={handlePreviewChange}
        variant="outlined"
        InputProps={{ readOnly: false }}
        sx={{ width: "100%", marginBottom: "1rem" }}
      />
    </Container>
  );
}

export default App;
