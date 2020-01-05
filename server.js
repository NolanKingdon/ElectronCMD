var app = require('express')();
var server = require('http').Server(app);
const io = require('socket.io')(server);
const { exec } = require('child_process');

server.listen(80);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});


// Command prompt stuff
let path = "C:\\Users\\Nolan\\";

function runCommand(command, socket){
    console.log(command);
    // WORKING SOLUTION -> But it makes pings slow
    let result = {
        path,
        error: "",
        stdout: "",
        stderr: ""
    };
    let event = exec(command, (err, stdout, stderr) => {
        if(err){
            result["error"] = err;
            socket.emit("COMMAND_ERROR", err);
        }
        if(stdout) {
            result["stdout"] = stdout;
            socket.emit("COMMAND_STDOUT", stdout);
        }
        if(stderr) {
            result["stderr"] = stderr;
            socket.emit("COMMAND_STDERR", stderr);
        }
    });
    
    /**
     * the command has concluded and we signal the user they can input commands again
     */
    event.on("close", (code) => {
        socket.emit("COMMAND_FINISHED", result);
        return result;
    });
}


io.on('connection', function(socket){

    socket.on("COMMAND_GIVEN", (data) => {
        let result;
        // Getting the initial path to change to
        let drive = path.substring(0,2);
        // Command has to switch to active drive, and change to path location before executing command
        let command = `${drive} && cd ${path} && ${data.command}`;
        // If the command provided is a directory change via lettered Directory argument
        if(data.command.split(":").length == 2){
            path = data.command + "\\";
            socket.emit("COMMAND_FINISHED", {path});
        } else {
            // If the command is a directory change via cd
            if(data.command.split(" ")[0] === "cd"){
                /**
                 * this is here because of the way that electron is using the command prompt.
                 * All executed commands are run through the node js command prompt and not 
                 * in a new one. Trying to change the directory will result in the command prompt 
                 * immediately snapping back to the root directory for the application
                 * 
                 * To avoid this we have to store the directory/path information in the backend
                 * and change to the directory and IMMEDIATELY execute the commands given (if they are
                 * commands that expect a result like dir, or ping, etc.)
                */
                
                command = data.command.substring(3, data.command.length);
                // Navigating backwards
                if(command === "../"){
                    path = path.split("\\").slice(0,-2).join("\\") + "\\";
                    console.log(path);
                } else {
                    // Ignoring the CD and starting with the actual command
                    path += data.command.substring(3, data.command.length) + "\\";
                }
                socket.emit("COMMAND_FINISHED", {path});
                // If our command is a directory lookup
            } else {
                /**
                 * Beacuse of the above, once we've made sure that we have our full path built out
                 * we can start running commands
                 */
                result = runCommand(command, socket);
            }
        } 
    });

    socket.on("AUTO_COMPLETE", (data) => {
        let splitCommand = data.command.split(" ");
        let startPattern = splitCommand.length > 1 ? splitCommand[splitCommand.length-1] : "";
        let regex = new RegExp(`^${startPattern}.*`);
        console.log(startPattern);
        let drive = path.substring(0,2);
        let command = `${drive} && cd ${path} && dir`;
        let result;
        exec(command, (err, stdout, stderr) => {
            if(stdout) {
                let splitOut = stdout.split("\r\n");
                let filesAndDirs = [];

                splitOut.forEach((row) => {
                    let splitRow = row.split(" ");
                    if(regex.exec(splitRow[splitRow.length-1])){
                        filesAndDirs.push(splitRow[splitRow.length-1]);
                    }
                })

                socket.emit("AUTO_COMPLETED", filesAndDirs);
            }
        });

    })

});

