$(window).on("load", function(){

    let commandIndex = 0;
    let previousCommands = [];
    // Flexbox is glitchy with overflow, so we're going to use this ugly solution
    // This lets us always scroll the faded ones back into existance too I suppose
    let brQuickFix = `<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>`;

    // Web socket
    const socket = io.connect('http://localhost');

    // Focusing to the input on click
    $(window).on("click", (e) => {
        $("#console-input").focus();
    })
    
    // Receiving the command and emitting to the socket
    $("#console-input").keydown(function(key){
        // Enter key check
        if(key.keyCode === 13){
            // Adding to previous commands
            previousCommands.push(this.value);
            // Adding to command index. Tracks length
            commandIndex+=1;
            if(this.value === "clear"){
                $("#text-layer").html(brQuickFix);
            } else if(this.value === "clear history") {
                commandIndex = 0;
                previousCommands = [];
            } else {
                $(this).attr("readonly");
                socket.emit("COMMAND_GIVEN", {command: this.value});
            }
            // Always want to clear out the old information from the console
            this.value = "";
        }

        // Tab -> Autocomplete feature
        if(key.keyCode === 9) {
            socket.emit("AUTO_COMPLETE", {command: this.value});
        }

        // Up arrow -> Prev command
        if(key.keyCode == 38){
            if(commandIndex > 0){
                let text = previousCommands[commandIndex-1];
                $("#console-input").val(text);
                commandIndex --;
            }
        }

        // Down arrow -> Forward a command
        if(key.keyCode == 40){
            if(commandIndex < previousCommands.length){
                let text = previousCommands[commandIndex+1];
                $("#console-input").val(text);
                commandIndex ++;
            }
        }
    })


    // Socket Interactions
    socket.on("COMMAND_FINISHED", (data) => {
        $("#console-input").removeAttr("readonly");
        $("#console-directory").html(data.path + ">");
    });
    socket.on("COMMAND_ERROR", (data) => {
        $("#text-layer").append(`<p class="command-error">${data}</p>`);
        adjustOpacity();
    });
    socket.on("COMMAND_STDOUT", (data) => {
        data.split("\n").forEach( line => {
            line = line.replace("<","&lt;");
            line = line.replace(">","&gt;");
            $("#text-layer").append(`<pre class="command-stdout">${line.replace(/ +(?= )/g,'    ')}</pre>`);        
        });
        let consoleWindow = document.getElementById("text-layer");
        // Put in a for loop to animate this all pretty
        consoleWindow.scrollTo(0,consoleWindow.scrollHeight);
        adjustOpacity();
    });

    socket.on("COMMAND_STDERR", (data) => {
        $("#text-layer").append(`<p class="command-stderr">${data}</p>`);
        adjustOpacity();
    });


    socket.on("AUTO_COMPLETED", (data) => {
        console.log(data);
        data.forEach((line) => {
            console.log(line);
            let consoleWindow = document.getElementById("text-layer");
            consoleWindow.scrollTo(0,consoleWindow.scrollHeight);
            $("#text-layer").append(`<pre class="command-stdout">${line}</pre>`);
        });
    })

    // Add in the opacity listener 
    $("#text-layer").on("scroll", function(){
        adjustOpacity();
    })

    // Functions

    function adjustOpacity(){
        // Starting the gradual fade immediately
        let fadeStart = 0.99;
        // Grabbing the window for reference
        let scrollArea = $(window);

        // For each of the items in the text layer, we want to calculate the opacity
        $("#text-layer").children().each(function(){
            // Finding the position of the individual element relative to the top of the window
            // Window remains static, but the text layer moves, causing shifting fades
            let position = $(this).offset().top - scrollArea.scrollTop();
            // Getting the height of the window
            let layerHeight = scrollArea.height();

            // If our current position (px) is less than the pixel height of our fade start
            if((position / (layerHeight * fadeStart)) <= 0) {
                // Preventing functionality by disappearing. Gotta keep them buffered
                $(this).css('opacity', 1);
            } else if(position < layerHeight * fadeStart) {
                // We will want to set our opacity to the position divided by pixel fade line.
                // lower numbers for the position result in lower opacities
                $(this).css('opacity', position / (layerHeight * fadeStart));
            } else {
                // If we scroll back under the fade line, set opacity to regular
                $(this).css('opacity', 1);
            }
        });
    }

    // Firing off when loaded as well
    adjustOpacity();
});