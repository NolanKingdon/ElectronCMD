const {app, BrowserWindow} = require('electron');
const server = require('./server.js');

function createWindow(){
    const w = 700;
    let win = new BrowserWindow({
        webPreferences: {
            devTools: true
        },
        transparent: true,
        frame: false,
        x: -w,
        y: 700,
        width: w,
        height: 400,
    });

    win.webContents.openDevTools();
    // Loading up the main page
    win.loadFile("./client/index.html");

    // Terminating the window
    win.on("closed", () => {
        win = null;
    })
}

app.on("ready", createWindow);
