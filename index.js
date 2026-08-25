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

async function StartNES() {
    document.getElementById("vm").style.display = "none";
    document.getElementById("divbutton").style.display = "none";
    document.getElementById("gamediv").style.display = "";
    document.getElementById("settingsliders").style.display = "none"
    document.getElementById("Warning").style.display = ""
    const startupBtn = document.getElementById("button");
    if (startupBtn) startupBtn.remove();

    const fileBlob = await AttemptToDownloadISO(false);

    const ROMURL = URL.createObjectURL(fileBlob);

    window.EJS_startOnLoaded = true;
    window.EJS_player = "#game";
    window.EJS_core = "nes";
    window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
    window.EJS_gameUrl = ROMURL;
    window.EJS_gameName = "famidash";
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
            8: { 'value': 'space', 'value2': 'BUTTON_1' }
        },
        1: {},
        2: {},
        3: {}
    };

    const script = document.createElement("script");
    script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
    document.body.appendChild(script);
}

async function ConnectCloudService() {
    document.getElementById("divbutton").style.display = "none";
    document.getElementById("settingsliders").style.display = "none"
    document.getElementById("Error").style.display = ""

    document.getElementById("statustext").innerHTML = "Connecting to server..."
    loading = true

    const socket = new WebSocket("ws://localhost:8080");

    socket.addEventListener("open", function(){
        loading = false
        document.getElementById("statustext").innerHTML = "Connected!"
        document.getElementById("statustext").style.background = "#00a000"
    })

    socket.addEventListener("error", function(event) {
        loading = false
        document.getElementById("statustext").innerHTML = "Server not active."
        document.getElementById("statustext").style.background = "#000000"
    });

    socket.onmessage = function(event) {
        const blob = new Blob([event.data], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);

        document.getElementById("screen").src = url;

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    };
}

function WhichToStart(){
    const state = document.getElementById("OperatingSystemSelector").value
    document.querySelector("#OperatingSystemSelector").disabled = true;

    if (state.startsWith("nes")) {
        StartNES()
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