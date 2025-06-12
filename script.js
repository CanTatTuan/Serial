let port = null;
let reader = null;
let isReading = false;
let sendInterval = null;
let isSending = false;

function $(id) {
    return document.getElementById(id);
}

function isSerialSupported() {
    if (!("serial" in navigator)) {
        alert("Trình duyệt không hỗ trợ Web Serial API.");
        return false;
    }
    return true;
}

async function getSerialOptions() {
    return {
        baudRate: parseInt($("baudRate")?.value || "9600"),
        dataBits: parseInt($("dataBits")?.value || "8"),
        stopBits: parseInt($("stopBits")?.value || "1"),
        parity: $("parity")?.value || "none",
        flowControl: $("flowControl")?.value || "none"
    };
}

$("connectButton")?.addEventListener("click", async () => {
    if (!isSerialSupported()) return;

    try {
        const options = await getSerialOptions();
        port = await navigator.serial.requestPort();
        await port.open(options);

        $("disconnectButton").disabled = false;
        $("connectButton").disabled = true;

        readSerialData();
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
        console.error(err);
    }
});

$("disconnectButton")?.addEventListener("click", async () => {
    try {
        isReading = false;
        if (reader) {
            await reader.cancel();
            reader.releaseLock();
        }
        if (port && port.readable) {
            await port.close();
        }
    } catch (err) {
        console.error("Lỗi ngắt kết nối:", err);
    } finally {
        $("connectButton").disabled = false;
        $("disconnectButton").disabled = true;
    }
});

async function readSerialData() {
    isReading = true;
    const textDecoder = new TextDecoderStream();

    try {
        await port.readable.pipeTo(textDecoder.writable).catch(err => {
            console.warn("Lỗi khi pipe dữ liệu:", err);
        });

        reader = textDecoder.readable.getReader();
        const output = $("serialOutput");
        const maxLength = 10000;

        while (isReading) {
            const { value, done } = await reader.read();
            if (done || !value) break;

            const formatted = formatData(value);
            output.value += formatted + "\n";

            if (output.value.length > maxLength) {
                output.value = output.value.slice(-maxLength);
            }

            if ($("autoScroll").checked) {
                output.scrollTop = output.scrollHeight;
            }
        }
    } catch (err) {
        console.error("Lỗi khi đọc dữ liệu:", err);
    } finally {
        try {
            reader?.releaseLock();
        } catch {}
    }
}

function formatData(data) {
    const format = $("dataFormat").value;
    if (format === "hex") {
        return [...data].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    } else if (format === "bin") {
        return [...data].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    }
    return data;
}

$("sendButton")?.addEventListener("click", () => {
    sendSerialData();
});

async function sendSerialData() {
    if (isSending) return;
    isSending = true;

    try {
        const data = $("serialInput")?.value.trim();
        if (!data || !port || !port.writable) return;

        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();
        await writer.write(encoder.encode(data + "\n"));
        writer.releaseLock();
    } catch (err) {
        console.error("Lỗi khi gửi dữ liệu:", err);
    } finally {
        isSending = false;
    }
}

$("autoSendButton")?.addEventListener("click", () => {
    const interval = parseInt($("intervalMs")?.value || "0");
    if (isNaN(interval) || interval <= 0) {
        alert("Chu kỳ gửi không hợp lệ!");
        return;
    }
    if (!port || !port.writable) {
        alert("Cổng Serial chưa sẵn sàng!");
        return;
    }

    if (sendInterval) clearInterval(sendInterval);
    sendInterval = setInterval(sendSerialData, interval);
});

$("stopSendButton")?.addEventListener("click", () => {
    if (sendInterval) {
        clearInterval(sendInterval);
        sendInterval = null;
    }
});

$("saveButton")?.addEventListener("click", () => {
    try {
        const data = $("serialOutput")?.value;
        const blob = new Blob([data], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "serial_log.txt";
        a.click();
    } catch (err) {
        console.error("Lỗi khi lưu tệp:", err);
    }
});

$("clearButton")?.addEventListener("click", () => {
    $("serialOutput").value = "";
});

$("darkMode")?.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");
});

window.addEventListener("beforeunload", (e) => {
    if (port) {
        e.preventDefault();
        e.returnValue = "";
    }
});
