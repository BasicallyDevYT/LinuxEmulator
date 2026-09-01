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
document.getElementById("PSPNotice").style.display = "none"

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

    const state = document.getElementById("OperatingSystemSelector").value

    if (state.startsWith("psp")) {
        EJS_emulator.gameManager.simulateInput(0, 0, 1);
    } else {
        EJS_emulator.gameManager.simulateInput(0, 8, 1);
    }
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

    const state = document.getElementById("OperatingSystemSelector").value

    if (state.startsWith("psp")) {
        EJS_emulator.gameManager.simulateInput(0, 0, 0);
    } else {
        EJS_emulator.gameManager.simulateInput(0, 8, 0);
    }

});

async function ClearCookies() {
    const doit = confirm(
        "This will clear all website cookies, Local Storage, Session Storage, IndexedDB, and Cache Storage. Do you want to continue?"
    );

    if (!doit) return;

    // Clear accessible cookies
    document.cookie.split(";").forEach(cookie => {
        const name = cookie.split("=")[0].trim();

        for (const path of ["/", location.pathname]) {
            document.cookie =
                `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
        }
    });

    // Clear Web Storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB
    if (indexedDB.databases) {
        const databases = await indexedDB.databases();

        await Promise.all(
            databases.map(db => {
                return new Promise(resolve => {
                    const request = indexedDB.deleteDatabase(db.name);

                    request.onsuccess = resolve;
                    request.onerror = resolve;
                    request.onblocked = resolve;
                });
            })
        );
    }

    // Clear Cache Storage
    if ("caches" in window) {
        const cacheNames = await caches.keys();

        await Promise.all(
            cacheNames.map(name => caches.delete(name))
        );
    }

    window.location.reload()
}


async function PrepareToStartLinux() {
    document.querySelector("#OperatingSystemSelector").disabled = true;
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

function OpenVMDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Linux", 1)

        request.onupgradeneeded = function(event) {
            const db = event.target.result

            if (!db.objectStoreNames.contains("saves")) {
                db.createObjectStore("saves")
            }
        }

        request.onsuccess = function() {
            const db = request.result

            // Safety check in case the database exists
            // but the object store somehow doesn't.
            if (!db.objectStoreNames.contains("saves")) {
                db.close()

                // Upgrade the database to create the missing store.
                const upgradeRequest = indexedDB.open("Linux", 2)

                upgradeRequest.onupgradeneeded = function(event) {
                    const upgradeDB = event.target.result

                    if (!upgradeDB.objectStoreNames.contains("saves")) {
                        upgradeDB.createObjectStore("saves")
                    }
                }

                upgradeRequest.onsuccess = function() {
                    resolve(upgradeRequest.result)
                }

                upgradeRequest.onerror = function() {
                    reject(upgradeRequest.error)
                }

                return
            }

            resolve(db)
        }

        request.onerror = function() {
            reject(request.error)
        }
    })
}


async function SaveVM() {
    try {
        const state = await emulator.save_state()

        const save = {
            ram: ram,
            vram: vram,
            state: state
        }

        const db = await OpenVMDatabase()

        const transaction = db.transaction("saves", "readwrite")
        transaction.objectStore("saves").put(save, "current")

        transaction.oncomplete = function() {
            db.close()

            Notify(
                "Virtual Machine State Saved Successfully!",
                "#1f8f4c"
            )
        }

        transaction.onerror = function() {
            db.close()

            Notify(
                "Failed to Save Virtual Machine State!",
                "#c0392b"
            )
        }

    } catch (error) {
        console.error(error)

        Notify(
            "Failed to Save Virtual Machine State!",
            "#c0392b"
        )
    }
}


async function LoadVM() {
    try {
        const db = await OpenVMDatabase()

        const transaction = db.transaction("saves", "readonly")
        const get = transaction.objectStore("saves").get("current")

        get.onsuccess = async function() {
            const save = get.result

            db.close()

            if (!save) {
                Notify(
                    "Failed to Load Virtual Machine State!",
                    "#c0392b"
                )
                return
            }

            try {
                await emulator.restore_state(save.state)

                Notify(
                    "Loaded Saved Virtual Machine State Successfully!",
                    "#1f8f4c"
                )
            } catch (error) {
                console.error(error)

                Notify(
                    "Failed to Load Virtual Machine State!",
                    "#c0392b"
                )
            }
        }

        get.onerror = function() {
            db.close()

            Notify(
                "Failed to Read Virtual Machine State!",
                "#c0392b"
            )
        }

    } catch (error) {
        console.error(error)

        Notify(
            "Failed to Open Virtual Machine Saves!",
            "#c0392b"
        )
    }
}


async function DeleteVM() {
    try {
        const db = await OpenVMDatabase()

        const transaction = db.transaction("saves", "readwrite")
        transaction.objectStore("saves").delete("current")

        transaction.oncomplete = function() {
            db.close()

            Notify(
                "Virtual Machine State Deleted Successfully!",
                "#1f8f4c"
            )
        }

        transaction.onerror = function() {
            db.close()

            Notify(
                "Failed to Delete Virtual Machine State!",
                "#c0392b"
            )
        }

    } catch (error) {
        console.error(error)

        Notify(
            "Failed to Delete Virtual Machine State!",
            "#c0392b"
        )
    }
}


async function ClearCookies() {
    const doit = confirm(
        "This will clear all website cookies, Local Storage, Session Storage, IndexedDB, and Cache Storage. Do you want to continue?"
    )

    if (!doit) return

    // Cookies
    document.cookie.split(";").forEach(cookie => {
        const name = cookie.split("=")[0].trim()

        for (const path of ["/", location.pathname]) {
            document.cookie =
                `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
        }
    })

    // Local + Session Storage
    localStorage.clear()
    sessionStorage.clear()

    // IndexedDB
    if (indexedDB.databases) {
        const databases = await indexedDB.databases()

        await Promise.all(
            databases.map(db => {
                return new Promise(resolve => {
                    const request = indexedDB.deleteDatabase(db.name)

                    request.onsuccess = resolve
                    request.onerror = resolve
                    request.onblocked = resolve
                })
            })
        )
    }

    // Cache Storage
    if ("caches" in window) {
        const cacheNames = await caches.keys()

        await Promise.all(
            cacheNames.map(name => caches.delete(name))
        )
    }

    // Reload so the application doesn't keep
    // using deleted database connections/state.
    location.reload()
}

document.getElementById("StateSelector").addEventListener("change", function() {
    document.getElementById("statebutton").style.display = "flex"
})

async function RunStateCheck() {
    const savedValue = JSON.parse(localStorage.getItem("IndexedDBAccepted")) ?? '';
    if (!Boolean(savedValue)) {
        const indexedaccepted = confirm('Before using the Save feature, You need to accept the use of Indexed DB. Press "OK" to continue or press "Cancel" to exit.')
        if (!indexedaccepted) {return} else {localStorage.setItem("IndexedDBAccepted", JSON.stringify(true));}
    }

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

async function StartConsole(id, threads, buttonmapping) {
    document.getElementById("vm").style.display = "none";
    document.getElementById("divbutton").style.display = "none";
    document.getElementById("gamediv").style.display = "";
    document.getElementById("settingsliders").style.display = "none"
    document.getElementById("Warning").style.display = ""
    document.querySelector("#OperatingSystemSelector").disabled = true;
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
            0: { 'value': buttonmapping[0], 'value2': 'BUTTON_2' },
            //  2: { 'value': 'Escape', 'value2': 'SELECT' },
            2: { 'value': buttonmapping[2], 'value2': 'SELECT' },
            3: { 'value': buttonmapping[3], 'value2': 'START' },
            4: { 'value': buttonmapping[4], 'value2': 'DPAD_UP' },
            5: { 'value': buttonmapping[5], 'value2': 'DPAD_DOWN' },
            6: { 'value': buttonmapping[6], 'value2': 'DPAD_LEFT' },
            7: { 'value': buttonmapping[7], 'value2': 'DPAD_RIGHT' },
            8: { 'value': buttonmapping[8], 'value2': 'BUTTON_1' },
            10: {
                'value': buttonmapping[10],
                'value2': 'LEFT_TOP_SHOULDER'
            },
            11: {
                'value': buttonmapping[11],
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

    const state = document.getElementById("OperatingSystemSelector").value

    if (state.startsWith("psp")) {
        Notify("Did you know that you can use the Left mouse button to trigger the X button?")
        document.getElementById("PSPNotice").style.display = "flex"
    } else {
        Notify("Did you know that you can use the Left mouse button to trigger the A button?")
    }
}

async function LoadWebsite(website) {
    document.querySelector("#OperatingSystemSelector").disabled = true;
    document.getElementById("IFrame").src = website
}

function WhichToStart(){
    const LocalStorageAccepted = JSON.parse(localStorage.getItem("LocalStorageAccepted")) ?? '';

    if (!Boolean(LocalStorageAccepted)) {
        const accepted = confirm('Before using Virtual Machines, You need to accept the use of Local Storage. Press "OK" to continue')
        if (!accepted) {return} else {localStorage.setItem("LocalStorageAccepted", JSON.stringify(true));} 
    }    
    
    const state = document.getElementById("OperatingSystemSelector").value

    if (state.startsWith("http")) {
        LoadWebsite(state)
        return
    }

    if (state.startsWith("nes")) {
        const savedValue = JSON.parse(localStorage.getItem("CookiesAccepted")) ?? '';
        if (!Boolean(savedValue)) {
            const cookiesaccepted = confirm('Before using EmulatorJS, You need to accept the use of Cookies, Press "OK" to continue or press "Cancel" to exit.')
            if (!cookiesaccepted) {return} else {localStorage.setItem("CookiesAccepted", JSON.stringify(true));}
        }

        StartConsole("nes", false, {
            0: "Backspace",
            2: "Tab",
            3: "Enter",
            4: "up arrow",
            5: "down arrow",
            6: "left arrow",
            7: "right arrow",
            8: "space",
            10: "l",
            11: "r"
        });
        return
    }

    if (state.startsWith("gba")) {
        const savedValue = JSON.parse(localStorage.getItem("CookiesAccepted")) ?? '';
        if (!Boolean(savedValue)) {
            const cookiesaccepted = confirm('Before using EmulatorJS, You need to accept the use of Cookies, Press "OK" to continue or press "Cancel" to exit.')
            if (!cookiesaccepted) {return} else {localStorage.setItem("CookiesAccepted", JSON.stringify(true));}
        }

        StartConsole("gba", false, {
            0: "Backspace",
            2: "Tab",
            3: "Enter",
            4: "up arrow",
            5: "down arrow",
            6: "left arrow",
            7: "right arrow",
            8: "space",
            10: "l",
            11: "r"
        });
        return
    }

    if (state.startsWith("nds")) {
        const savedValue = JSON.parse(localStorage.getItem("CookiesAccepted")) ?? '';
        if (!Boolean(savedValue)) {
            const cookiesaccepted = confirm('Before using EmulatorJS, You need to accept the use of Cookies, Press "OK" to continue or press "Cancel" to exit.')
            if (!cookiesaccepted) {return} else {localStorage.setItem("CookiesAccepted", JSON.stringify(true));}
        }
        
        StartConsole("nds", false, {
            0: "Backspace",
            2: "Tab",
            3: "Enter",
            4: "up arrow",
            5: "down arrow",
            6: "left arrow",
            7: "right arrow",
            8: "space",
            10: "l",
            11: "r"
        });
        return
    }

    if (state.startsWith("psp")) {
        const savedValue = JSON.parse(localStorage.getItem("CookiesAccepted")) ?? '';
        if (!Boolean(savedValue)) {
            const cookiesaccepted = confirm('Before using EmulatorJS, You need to accept the use of Cookies, Press "OK" to continue or press "Cancel" to exit.')
            if (!cookiesaccepted) {return} else {localStorage.setItem("CookiesAccepted", JSON.stringify(true));}
        }

        StartConsole("psp", true, {
            0: "space",
            2: "Tab",
            3: "Enter",
            4: "up arrow",
            5: "down arrow",
            6: "left arrow",
            7: "right arrow",
            8: "Backspace",
            10: "l",
            11: "r"
        });
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