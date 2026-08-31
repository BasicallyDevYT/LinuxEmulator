let ram
let vram
let emulator
function EnterFullscreen(){document.getElementById("vm").requestFullscreen()}
document.addEventListener("fullscreenchange", function(){if (document.fullscreenElement) {emulator.screen_set_scale(1.5, 1.5)} else {emulator.screen_set_scale(1, 1)}})
Setup()
document.getElementById("vm").style.display = "flex";
document.getElementById("gamediv").style.display = "none";
document.getElementById("Warning").style.display = "none"
document.getElementById("Error").style.display = "none"
document.getElementById("retry").style.display = "none"
document.getElementById("screen").style.display = "none"

let mouseA = false;

document.addEventListener("mousedown", function (e) {
    console.log("mousedown target:", e.target);
    console.log("mousedown target ID:", e.target.id);
    console.log("mousedown target class:", e.target.className);

    if (!window.EJS_emulator) {
        console.log("EJS_emulator does not exist");
        return;
    }

    const id = e.target.id;
    const isCanvas = e.target.classList.contains("ejs_canvas");

    if (
        id !== "game" &&
        id !== "gamediv" &&
        id !== "gamecanvas" &&
        !isCanvas
    ) {
        console.log("Invalid target");
        return;
    }

    mouseA = true;
    console.log("Valid target - pressing A");

    EJS_emulator.gameManager.simulateInput(0, 8, 1);
});

document.addEventListener("mouseup", function (e) {
    console.log("mouseup target:", e.target);
    console.log("mouseup target ID:", e.target.id);
    console.log("mouseup target class:", e.target.className);

    if (!window.EJS_emulator) {
        console.log("EJS_emulator does not exist");
        return;
    }

    if (!mouseA) {
        console.log("No active mouse A press");
        return;
    }

    mouseA = false;
    console.log("Releasing A");

    EJS_emulator.gameManager.simulateInput(0, 8, 0);
});



async function PrepareToStartLinux() {
    StartLinux(document.getElementById("OperatingSystemSelector").value)
}

async function StartLinux(diskType) {
    document.getElementById("gamediv").style.display = "none";
    document.getElementById("vm").style.display = "flex";
    document.getElementById("button").remove()
    HideSettings()
    const ISO = await AttemptToDownloadISO(true)
    document.getElementById("controls").style.display = "flex"
    let storage = {}

    if (diskType.startsWith("floppy")) {
        storage = {
            fda: {
                buffer: ISO
            }
        }
    } else if (diskType.startsWith("harddisk")) {
        storage = {
            hda: {
                buffer: ISO
            }
        }
    } else {
        storage = {
            cdrom: {
                buffer: ISO
            }
        }
    }

    emulator = new V86({
        screen_container: document.getElementById("vm"),
        memory_size: ram,
        vga_memory_size: vram,
        network_adapter: true,
        audio: true,
        filesystem: {},
        ...storage,

        bios: {
            url: "bios/seabios.bin"
        },

        vga_bios: {
            url: "bios/vgabios.bin"
        },

        net_device: {
            type: "ne2k",
            relay_url: "wss://relay.widgetry.org/"
        },
    })

    emulator.add_listener("emulator-ready", async function() {
        await emulator.run()
    })

    document.getElementById("vm").addEventListener("click", function() {
        emulator.lock_mouse()
    })
}

async function Setup(){
    ram = Math.abs(Number(document.getElementById("Ram").value) * 1024 * 1024)
    const gb = (ram / 1024 / 1024 / 1024).toFixed(2);
    document.getElementById("RamLabel").innerHTML = "Ram (" + gb + " GB) :"
    vram = Math.abs(Number(document.getElementById("VRam").value) * 1024 * 1024)
    const mb = (vram / 1024 / 1024).toFixed(0);
    document.getElementById("VRamLabel").innerHTML = "VRam (" + mb + " MB) :"
    document.getElementById("controls").style.display = "none"
    document.getElementById("statebutton").style.display = "none"
}

async function HideSettings(){
    document.getElementById("Ram").style.display = "none"
    document.getElementById("VRam").style.display = "none"
    ram = Math.abs(Number(document.getElementById("Ram").value) * 1024 * 1024)
    const gb = (ram / 1024 / 1024 / 1024).toFixed(2);
    document.getElementById("RamLabel").innerHTML = "Ram (" + gb + " GB)"
    vram = Math.abs(Number(document.getElementById("VRam").value) * 1024 * 1024)
    const mb = (vram / 1024 / 1024).toFixed(0);
    document.getElementById("VRamLabel").innerHTML = "VRam (" + mb + " MB)"
}

document.getElementById("Ram").addEventListener("input", function(){
    ram = Math.abs(Number(document.getElementById("Ram").value) * 1024 * 1024)
    const gb = (ram / 1024 / 1024 / 1024).toFixed(2);
    document.getElementById("RamLabel").innerHTML = "Ram (" + gb + " GB) :"
})

document.getElementById("VRam").addEventListener("input", function(){
    vram = Math.abs(Number(document.getElementById("VRam").value) * 1024 * 1024)
    const mb = (vram / 1024 / 1024).toFixed(0);
    document.getElementById("VRamLabel").innerHTML = "VRam (" + mb + " MB) :"
})

async function AttemptToDownloadISO(ReturnArrayBuffer){
    const StatusText = document.getElementById("statustext")
    StatusText.innerHTML = "Starting download..."
    // const url = "https://huggingface.co/datasets/BasicallyDev/VoidLinuxISOS/resolve/main/linux.iso"
    const url = "https://huggingface.co/datasets/BasicallyDev/VoidLinuxISOS/resolve/main/" + document.getElementById("OperatingSystemSelector").value
    document.body.style.cursor = "wait"
    const file = await fetch(url)
    const total = Number(file.headers.get("Content-Length"))
    const filenameHeader = file.headers.get("Content-Disposition")
    const filename = decodeURIComponent(filenameHeader.split("filename*=UTF-8''")[1].split(";")[0])
    const reader = file.body.getReader()
    const data = []
    let downloaded = 0
    while (true) {
        const {value, done} = await reader.read()
        if (done) {break}
        data.push(value)
        downloaded += value.length
        const percent = ((downloaded / total) * 100).toFixed(2)
        StatusText.innerHTML = percent + "% Done (" + downloaded + " Bytes)"
        StatusText.style.background = `linear-gradient(to right, green ${percent}%, black ${percent}%)`
    }
    const fileBlob = new Blob(data)
    StatusText.innerHTML = "Downloaded " + filename + " successfully!"
    document.body.style.cursor = "default"
    if (ReturnArrayBuffer) {return fileBlob.arrayBuffer()}
    if (!ReturnArrayBuffer) {return fileBlob}
}

async function SaveVM() {
    try {
        const state = await emulator.save_state()

        const save = {
            ram: ram,
            vram: vram,
            state: state
        }

        const request = indexedDB.open("Linux", 1)

        request.onupgradeneeded = function() {
            request.result.createObjectStore("saves")
        }

        request.onsuccess = function() {
            try {
                const db = request.result
                const transaction = db.transaction("saves", "readwrite")

                transaction.objectStore("saves").put(save, "current")

                transaction.oncomplete = function() {
                    Notify("Virtual Machine State Saved Successfully!", "#1f8f4c")
                }

                transaction.onerror = function() {
                    Notify("Failed to Save Virtual Machine State!", "#c0392b")
                }
            } catch (error) {
                Notify("Failed to Save Virtual Machine State!", "#c0392b")
            }
        }

        request.onerror = function() {
            Notify("Failed to Open Virtual Machine Saves!", "#c0392b")
        }
    } catch (error) {
        Notify("Failed to Save Virtual Machine State!", "#c0392b")
    }
}

async function LoadVM() {
    const request = indexedDB.open("Linux", 1)

    request.onsuccess = function() {
        const db = request.result
        const transaction = db.transaction("saves", "readonly")
        const get = transaction.objectStore("saves").get("current")

        get.onsuccess = async function() {
            const save = get.result

            if (!save) {
                Notify("Failed to Load Virtual Machine State!", "#c0392b")
                return
            }

            try {

                await emulator.restore_state(save.state)

                Notify("Loaded Saved Virtual Machine State Successfully!", "#1f8f4c")
            } catch (error) {
                Notify("Failed to Load Virtual Machine State!", "#c0392b")
            }
        }

        get.onerror = function() {
            Notify("Failed to Read Virtual Machine State!", "#c0392b")
        }
    }

    request.onerror = function() {
        Notify("Failed to Open Virtual Machine Saves!", "#c0392b")
    }
}

async function DeleteVM() {
    try {
        const request = indexedDB.open("Linux", 1)

        request.onsuccess = function() {
            try {
                const db = request.result
                const transaction = db.transaction("saves", "readwrite")

                transaction.objectStore("saves").delete("current")

                transaction.oncomplete = function() {
                    Notify("Virtual Machine State Deleted Successfully!", "#1f8f4c")
                }

                transaction.onerror = function() {
                    Notify("Failed to Delete Virtual Machine State!", "#c0392b")
                }
            } catch (error) {
                Notify("Failed to Delete Virtual Machine State!", "#c0392b")
            }
        }

        request.onerror = function() {
            Notify("Failed to Open Virtual Machine Saves!", "#c0392b")
        }
    } catch (error) {
        Notify("Failed to Delete Virtual Machine State!", "#c0392b")
    }
}
document.getElementById("StateSelector").addEventListener("change", function() {
    document.getElementById("statebutton").style.display = "flex"
})

async function RunStateCheck() {
    const state = document.getElementById("StateSelector").value

    if (state == "load") {
        LoadVM()
    }

    if (state == "save") {
        SaveVM()
    }

    if (state == "delete") {
        DeleteVM()
    }

    if (state == "nonselected") {
        document.getElementById("statebutton").style.display = "none"
    }
}

function Notify(text, color = "#555") {
    const container = document.getElementById("notifications")

    const notification = document.createElement("div")
    notification.className = "notification"
    notification.style.background = color

    notification.innerHTML = `
        ${text}
        <button class="notification-close">×</button>
    `

    container.appendChild(notification)

    notification.offsetHeight

    notification.classList.add("show")

    const close = notification.querySelector(".notification-close")

    close.onclick = function() {
        notification.classList.remove("show")

        setTimeout(function() {
            notification.remove()
        }, 250)
    }

    setTimeout(function() {
        if (notification.parentElement) {
            notification.classList.remove("show")

            setTimeout(function() {
                notification.remove()
            }, 250)
        }
    }, 5000)
}

function downloadFromUrl() {
  const link = document.createElement('a');
  link.href = "https://huggingface.co/datasets/BasicallyDev/VoidLinuxISOS/resolve/main/" + document.getElementById("OperatingSystemSelector").value
  link.download = document.getElementById("OperatingSystemSelector").value
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function StartConsole(id, threads) {
    document.getElementById("vm").style.display = "none";
    document.getElementById("divbutton").style.display = "none";
    document.getElementById("gamediv").style.display = "";
    document.getElementById("settingsliders").style.display = "none"
    document.getElementById("Warning").style.display = ""
    const startupBtn = document.getElementById("button");
    if (startupBtn) startupBtn.remove();

    const fileBlob = await AttemptToDownloadISO(false);

    const ROMURL = URL.createObjectURL(fileBlob);

    window.EJS_pathtodata = "https://cdn.emulatorjs.org/nightly/data/";
    window.EJS_startOnLoaded = true;
    window.EJS_player = "#game";
    window.EJS_core = id;
    window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
    window.EJS_gameUrl = ROMURL;
    window.EJS_gameName = "famidash";
    EJS_threads = threads
    window.EJS_defaultControls = {
        0: {
            0: { 'value': 'Backspace', 'value2': 'BUTTON_2' },
            //  2: { 'value': 'Escape', 'value2': 'SELECT' },
            2: { 'value': 'Tab', 'value2': 'SELECT' },
            3: { 'value': 'Enter', 'value2': 'START' },
            4: { 'value': 'up arrow', 'value2': 'DPAD_UP' },
            5: { 'value': 'down arrow', 'value2': 'DPAD_DOWN' },
            6: { 'value': 'left arrow', 'value2': 'DPAD_LEFT' },
            7: { 'value': 'right arrow', 'value2': 'DPAD_RIGHT' },
            8: { 'value': 'space', 'value2': 'BUTTON_1' },
            10: {
                'value': 'l',
                'value2': 'LEFT_TOP_SHOULDER'
            },
            11: {
                'value': 'r',
                'value2': 'RIGHT_TOP_SHOULDER'
            },
        },
        1: {},
        2: {},
        3: {}
    };

    const script = document.createElement("script");
    script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
    document.body.appendChild(script);

    Notify("Did you know that you can use the Left mouse button to trigger the A button?")
}

async function test() {
    fill = 0;
    offset = 0;

    document.getElementById("divbutton").style.display = "none";
    document.getElementById("settingsliders").style.display = "none";
    document.getElementById("Error").style.display = "";

    document.getElementById("statustext").innerHTML = "Connecting to server...";
    document.getElementById("statustext").style.background = "#000000";

    loading = true;

    let loadingaudio = new Audio("loading.mp3");
    loadingaudio.loop = true;
    loadingaudio.play();
}

let pc = null;
let reconnectTimer = null;

async function ConnectCloudService() {
    function disconnectPC() {
    if (pc) {
        pc.getSenders().forEach(sender => {
            if (sender.track) {
                sender.track.stop();
            }
        });

        pc.close();
        pc = null;
    }
}
    document.getElementById("retry").style.display = "none";
    fill = 0;
    offset = 0;

    document.getElementById("divbutton").style.display = "none";
    document.getElementById("settingsliders").style.display = "none";
    document.getElementById("Error").style.display = "";

    document.getElementById("statustext").innerHTML = "Connecting to server...";
    document.getElementById("statustext").style.background = "#000000";
    loading = true;

    let loadingaudio = new Audio("loading.mp3");
    loadingaudio.loop = true;
    loadingaudio.play();

    document.getElementById("vm").style.display = "none";

    /*const inputSocket = new WebSocket("ws://localhost:8080");
    const mouseSocket = new WebSocket("ws://localhost:8081");

    inputSocket.onopen = () => {
        console.log("Input WebSocket connected!");
    };

    inputSocket.onclose = () => {
        console.log("Input WebSocket disconnected!");
        document.getElementById("statustext").innerHTML = "Input server was disconnected from client."
        document.getElementById("statustext").style.background = "#000000";
        document.getElementById("retry").style.display = "flex"  

        loadingaudio.pause();
        const errorsound = new Audio("error.mp3");
        errorsound.loop = false;
        errorsound.play().catch(error => {
            console.log("Error sound couldn't play:", error);
        });

        loading = false;

        disconnectPC()
    };

    mouseSocket.onerror = (error) => {
        console.log("Mouse WebSocket error:", error);
    };

    mouseSocket.onopen = () => {
        console.log("Mouse WebSocket connected!");
    };

    mouseSocket.onclose = () => {
        console.log("Mouse WebSocket disconnected!");
        inputSocket.close()
    };

    inputSocket.onerror = (error) => {
        console.log("Input WebSocket error:", error);
    };

    document.addEventListener("keydown", (event) => {
        if (inputSocket.readyState !== WebSocket.OPEN) return;

        const keyMap = {
            KeyA: "KEY_A",
            KeyB: "KEY_B",
            KeyC: "KEY_C",
            KeyD: "KEY_D",
            KeyE: "KEY_E",
            KeyF: "KEY_F",
            KeyG: "KEY_G",
            KeyH: "KEY_H",
            KeyI: "KEY_I",
            KeyJ: "KEY_J",
            KeyK: "KEY_K",
            KeyL: "KEY_L",
            KeyM: "KEY_M",
            KeyN: "KEY_N",
            KeyO: "KEY_O",
            KeyP: "KEY_P",
            KeyQ: "KEY_Q",
            KeyR: "KEY_R",
            KeyS: "KEY_S",
            KeyT: "KEY_T",
            KeyU: "KEY_U",
            KeyV: "KEY_V",
            KeyW: "KEY_W",
            KeyX: "KEY_X",
            KeyY: "KEY_Y",
            KeyZ: "KEY_Z",

            Digit0: "KEY_0",
            Digit1: "KEY_1",
            Digit2: "KEY_2",
            Digit3: "KEY_3",
            Digit4: "KEY_4",
            Digit5: "KEY_5",
            Digit6: "KEY_6",
            Digit7: "KEY_7",
            Digit8: "KEY_8",
            Digit9: "KEY_9",

            Minus: "KEY_MINUS",
            Equal: "KEY_EQUAL",
            BracketLeft: "KEY_LEFTBRACE",
            BracketRight: "KEY_RIGHTBRACE",
            Backslash: "KEY_BACKSLASH",
            Semicolon: "KEY_SEMICOLON",
            Quote: "KEY_APOSTROPHE",
            Backquote: "KEY_GRAVE",
            Comma: "KEY_COMMA",
            Period: "KEY_DOT",
            Slash: "KEY_SLASH",

            Space: "KEY_SPACE",
            Enter: "KEY_ENTER",
            Backspace: "KEY_BACKSPACE",
            Tab: "KEY_TAB",
            Escape: "KEY_ESC",

            ArrowUp: "KEY_UP",
            ArrowDown: "KEY_DOWN",
            ArrowLeft: "KEY_LEFT",
            ArrowRight: "KEY_RIGHT",

            CapsLock: "KEY_CAPSLOCK",

            Insert: "KEY_INSERT",
            Delete: "KEY_DELETE",
            Home: "KEY_HOME",
            End: "KEY_END",
            PageUp: "KEY_PAGEUP",
            PageDown: "KEY_PAGEDOWN",

            F1: "KEY_F1",
            F2: "KEY_F2",
            F3: "KEY_F3",
            F4: "KEY_F4",
            F5: "KEY_F5",
            F6: "KEY_F6",
            F7: "KEY_F7",
            F8: "KEY_F8",
            F9: "KEY_F9",
            F10: "KEY_F10",
            F11: "KEY_F11",
            F12: "KEY_F12"
        };

        const key = keyMap[event.code];

        if (!key) return;

        const keys = [];

        // Caps Lock is a toggle, so send ONLY Caps Lock.
        if (event.code === "CapsLock") {
            keys.push("KEY_CAPSLOCK");
        } else {
            if (event.shiftKey) {
                keys.push("KEY_LEFTSHIFT");
            }

            if (event.ctrlKey) {
                keys.push("KEY_LEFTCTRL");
            }

            if (event.altKey) {
                keys.push("KEY_LEFTALT");
            }

            keys.push(key);
        }

        inputSocket.send(JSON.stringify({
            type: "keydown",
            keys: keys
        }));
    });

    document.addEventListener("keyup", (event) => {
        if (inputSocket.readyState !== WebSocket.OPEN) return;

        inputSocket.send(JSON.stringify({
            type: "keyup",
            key: event.key,
            code: event.code,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            repeat: event.repeat,
            capsLock: event.getModifierState("CapsLock")
        }));
    });

    document.getElementById("screen").addEventListener("mousemove", (event) => {
        if (mouseSocket.readyState !== WebSocket.OPEN) return;

        mouseSocket.send(JSON.stringify({
            type: "mousemove",
            x: event.movementX,
            y: event.movementY
        }));
    });

    document.getElementById("screen").addEventListener("mousedown", (event) => {
        if (mouseSocket.readyState !== WebSocket.OPEN) return;

        mouseSocket.send(JSON.stringify({
            type: "mousedown",
            button: event.button
        }));
    });

    document.getElementById("screen").addEventListener("mouseup", (event) => {
        if (mouseSocket.readyState !== WebSocket.OPEN) return;

        mouseSocket.send(JSON.stringify({
            type: "mouseup",
            button: event.button
        }));
    });*/

    if (pc) {
        pc.close();
        pc = null;
    }

    pc = new RTCPeerConnection();

    pc.addTransceiver("video", {
        direction: "recvonly"
    });

    pc.addTransceiver("audio", {
        direction: "recvonly"
    });

    pc.ontrack = (event) => {
        console.log("TRACK RECEIVED:", event.track.kind);

        document.getElementById("screen").srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
        console.log("WebRTC:", pc.connectionState);

        if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
        ) {
            loading = false;

            loadingaudio.pause();

            const errorsound = new Audio("error.mp3");
            errorsound.loop = false;

            errorsound.play().catch(error => {
                console.log("Error sound couldn't play:", error);
            });

            document.getElementById("statustext").innerHTML =
                "No stream was found, retrying...";

            document.getElementById("statustext").style.background = "#000000";
            document.getElementById("retry").style.display = "flex";
            document.getElementById("screen").style.display = "none"; 

            reconnect();
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log("ICE:", pc.iceConnectionState);
    };

    try {
        const offer = await pc.createOffer();

        await pc.setLocalDescription(offer);

        await new Promise(resolve => {
            if (pc.iceGatheringState === "complete") {
                resolve();
            } else {
                pc.addEventListener("icegatheringstatechange", () => {
                    if (pc.iceGatheringState === "complete") {
                        resolve();
                    }
                });
            }
        });

        const response = await fetch(
            "http://localhost:8889/live/desktop-web/whep",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/sdp"
                },
                body: pc.localDescription.sdp
            }
        );

        if (!response.ok) {
            loading = false;

            loadingaudio.pause();

            const errorsound = new Audio("error.mp3");
            errorsound.loop = false;

            errorsound.play().catch(error => {
                console.log("Error sound couldn't play:", error);
            });

            document.getElementById("retry").style.display = "flex"  
            document.getElementById("screen").style.display = "none"; 
            throw new Error("Stream unavailable: " + response.status);
        }

        const answer = await response.text();

        await pc.setRemoteDescription({
            type: "answer",
            sdp: answer
        });

        loading = false;

        document.getElementById("statustext").innerHTML = "Connected!";
        document.getElementById("statustext").style.background = "#00a000";
        document.getElementById("screen").style.display = "flex";

        loadingaudio.pause();

        let workaudio = new Audio("work.mp3");
        workaudio.loop = false;
        workaudio.play();
        document.getElementById("screen").style.display = "block";

    } catch (error) {
        console.log("Connection failed:", error);

        loading = false;
        loadingaudio.pause();

        if (pc) {
            pc.close();
            pc = null;
        }

        document.getElementById("statustext").innerHTML =
        "Stream unavailable, Please try again later.";
        document.getElementById("statustext").style.background = "#000000";
        document.getElementById("retry").style.display = "flex" 
        document.getElementById("screen").style.display = "none"; 
    }
}

function WhichToStart(){
    const state = document.getElementById("OperatingSystemSelector").value
    document.querySelector("#OperatingSystemSelector").disabled = true;

    if (state.startsWith("nes")) {
        StartConsole("nes", false)
        return
    }

    if (state.startsWith("gba")) {
        StartConsole("gba", false)
        return
    }

     if (state.startsWith("nds")) {
        StartConsole("melonds", false)
        return
    }


    if (state.startsWith("cloudservice")) {
        ConnectCloudService()
        return
    }

    PrepareToStartLinux()
}

loading = false
fill = 0
offset = 0

setInterval(() => {
    if (loading) {
        document.getElementById("statustext").style.background =
            `linear-gradient(
                to right,
                #000000 0%,
                #000000 ${offset}%,
                #00a000 ${offset}%,
                #00a000 ${offset + fill}%,
                #000000 ${offset + fill}%,
                #000000 100%
            )`;

        if (fill < 50 && offset === 0) {
            fill++;
        } else if (fill === 50 && offset < 50) {
            offset++;
        } else if (fill > 0 && offset >= 50) {
            fill--;
            offset++;
        } else {
            fill = 0;
            offset = 0;
        }
    }
}, 20);
