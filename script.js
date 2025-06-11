let port;
let reader;
let isReading = false;

async function getSerialOptions() {
    return {
        baudRate: parseInt(document.getElementById("baudRate").value),
        dataBits: parseInt(document.getElementById("dataBits").value),
        stopBits: parseInt(document.getElementById("stopBits").value),
        parity: document.getElementById("parity").value,
        flowControl: document.getElementById("flowControl").value
    };
}

document.getElementById("connectButton").addEventListener("click", async () => {
    try {
        const options = await getSerialOptions();

        port = await navigator.serial.requestPort();
        await port.open(options);

        document.getElementById("disconnectButton").disabled = false;
        document.getElementById("connectButton").disabled = true;

        readSerialData();
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
    }
});

document.getElementById("disconnectButton").addEventListener("click", async () => {
    try {
        isReading = false;
        if (reader) await reader.cancel();
        if (port && port.readable) await port.close();

        document.getElementById("disconnectButton").disabled = true;
        document.getElementById("connectButton").disabled = false;
    } catch (err) {
        console.error("Lỗi ngắt kết nối:", err);
    }
});

async function readSerialData() {
    isReading = true;
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    const output = document.getElementById("serialOutput");
    const maxLength = 10000; // Giới hạn 10.000 ký tự tránh overflow

    try {
        while (isReading) {
            const { value, done } = await reader.read();
            if (done || !value) break;

            const formatted = formatData(value);
            output.value += formatted + "\n";

            // Giới hạn buffer output
            if (output.value.length > maxLength) {
                output.value = output.value.slice(-maxLength);
            }

            if (document.getElementById("autoScroll").checked) {
                output.scrollTop = output.scrollHeight;
            }
        }
    } catch (error) {
        console.error("Lỗi đọc dữ liệu:", error);
    } finally {
        reader.releaseLock();
    }
}

document.getElementById("sendButton").addEventListener("click", async () => {
    if (!port || !port.writable) {
        alert("Cổng Serial chưa mở hoặc không sẵn sàng!");
        return;
    }

    const data = document.getElementById("serialInput").value.trim();
    if (!data) {
        alert("Không được gửi dữ liệu trống!");
        return;
    }

    const encoder = new TextEncoder();
    let writer;

    try {
        writer = port.writable.getWriter();
        await writer.write(encoder.encode(data + "\n"));
    } catch (err) {
        alert("Lỗi khi gửi: " + err.message);
    } finally {
        if (writer) writer.releaseLock();
    }
});

document.getElementById("saveButton").addEventListener("click", () => {
    const data = document.getElementById("serialOutput").value;
    const blob = new Blob([data], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "serial_data.txt";
    a.click();
});

document.getElementById("clearButton").addEventListener("click", () => {
    document.getElementById("serialOutput").value = "";
});

document.getElementById("darkMode").addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");
});

function formatData(data) {
    const format = document.getElementById("dataFormat").value;
    if (format === "hex") {
        return [...data].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    } else if (format === "bin") {
        return [...data].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    }
    return data;
}
