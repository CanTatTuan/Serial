let port;
let reader;
let writer;
let isReading = false;

document.getElementById("connectButton").addEventListener("click", async () => {
    try {
        let baudRateValue = parseInt(document.getElementById("baudRate").value);
        if (isNaN(baudRateValue) || baudRateValue <= 0) {
            alert("Baud rate không hợp lệ! Vui lòng nhập số dương.");
            return;
        }

        port = await navigator.serial.requestPort();
        if (!port) {
            alert("Không có thiết bị nào được chọn! Vui lòng chọn một cổng Serial.");
            return;
        }

        await port.open({ baudRate: baudRateValue });

        document.getElementById("disconnectButton").disabled = false;
        document.getElementById("connectButton").disabled = true;

        readSerialData();
    } catch (error) {
        console.error("Lỗi kết nối Serial:", error);
        alert("Lỗi kết nối Serial: " + error.message);
    }
});

document.getElementById("disconnectButton").addEventListener("click", async () => {
    if (port) {
        await port.close();
        document.getElementById("disconnectButton").disabled = true;
        document.getElementById("connectButton").disabled = false;
        isReading = false;
    }
});

async function readSerialData() {
    isReading = true;
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    try {
        while (isReading) {
            const { value, done } = await reader.read();
            if (done) break;

            if (typeof value !== "string") {
                console.warn("Dữ liệu nhận được không phải chuỗi:", value);
                continue;
            }

            let formattedValue = formatData(value);
            document.getElementById("serialOutput").value += formattedValue + "\n";

            if (document.getElementById("autoScroll").checked) {
                document.getElementById("serialOutput").scrollTop = document.getElementById("serialOutput").scrollHeight;
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
        alert("Cổng Serial chưa sẵn sàng để gửi dữ liệu!");
        return;
    }

    const textEncoder = new TextEncoder();
    writer = port.writable.getWriter();
    const data = document.getElementById("serialInput").value + "\n";
    
    try {
        await writer.write(textEncoder.encode(data));
    } catch (error) {
        console.error("Lỗi khi gửi dữ liệu:", error);
        alert("Lỗi khi gửi dữ liệu: " + error.message);
    } finally {
        writer.releaseLock();
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
    if (typeof data !== "string") {
        data = new TextDecoder().decode(data);
    }

    let format = document.getElementById("dataFormat").value;
    if (format === "hex") {
        return [...data].map(char => char.charCodeAt(0).toString(16)).join(" ");
    } else if (format === "bin") {
        return [...data].map(char => char.charCodeAt(0).toString(2)).join(" ");
    }
    return data;
}
