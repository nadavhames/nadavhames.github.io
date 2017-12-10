if (!util.supports.data) {
    $('.no-support').show().next().hide();
}
var player;
var peer;
var peerId;
var connect;
var opponent = {
    peerId: ""
}
var myturn = false;

function init(){
    peer = new Peer('',{key: '55gez321n990ms4i'});
        peer.on('open', function(id) {
        peerId = id;
        })
        peer.on('error', function(err) {
            alert('' + err);
        }) 
}

//host an join button handling
function hostStart(){
    init();
    peer.on('open', function() {
        $('#game .alert p').text('Waiting for opponent').append($('<span class="pull-right"></span>').text('Your ID: '+ peerId));
        $('#game').show().siblings('#menu').hide();
        alert('Send this code to player 2: ' + peerId);
    })
    peer.on('connection', function(c) {
        if (connect){
            c.close();
            return;
        }
        connect = c;
        player = 1;
        $('#game .alert p').text('Your Turn!');
        myturn = true;
        start();
    })
}

function join(){
    init();
    peer.on('open',function() {
    var dest = prompt("Opponents ID:");
    connect = peer.connect(dest, {
        reliable: true
    })
    connect.on('open', function() {
        opponent.peerId = dest;
        player = 2;
        $('#game .alert p').text("Waiting for opponents move..");
        $('#game').show().siblings('#menu').hide();
        myturn = false;
        start();
        })
    })  
}

var restartPressed = false;
function restart(){
    restartPressed = true;
    connect.send(['restart']);
    if (document.getElementById("ro").innerHTML == "Opponent has accepted"){
        if (player == 1){
            $('#game .alert p').text('Your Turn!');
            $('#game').show().siblings('#restart').hide();
            myturn = true;
            start();
        }
        if (player == 2){
            $('#game .alert p').text("Waiting for opponents move..");
            $('#game').show().siblings('#restart').hide();
            myturn = false;
            start();
        }
    } 
}

function showRestart() {
    $('#restart').show().siblings('#game').hide().siblings('#menu').hide();
}
/////////////////////
function getRandomColour() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    if (color == 'black' || color == 'white') {
        getRandomColour();
    } else {
        return color;
    }
}

var colour;
function newgame(){
    //get rid of all extra events by replacing board with a clone of itself
    var el = document.getElementById("board");
    elClone = el.cloneNode(true);
    el.parentNode.replaceChild(elClone,el);
    //run the game
    start();
    
}
function start(){
    var board = document.getElementById("board").getElementsByTagName("td");
    var turn = document.getElementById("turntable").getElementsByTagName("td");
    var turntxt = document.getElementById("turn");
    colour = getRandomColour();
    
    //make turn text and background colour white (invisible)
    turn[0].style.backgroundColor = "white";
    turntxt.style.color = "white";
    turn[0].style.border = "1px solid white";
    
    //Intro Animation and board set up
    middle();
    function middle() {
        board[27].style.backgroundColor = colour;
        board[28].style.backgroundColor = colour;
        board[35].style.backgroundColor = colour;
        board[36].style.backgroundColor = colour;
        setTimeout(outer1, 500);
    }
    function outer1() {
        board[18].style.backgroundColor = colour;
        board[19].style.backgroundColor = colour;
        board[20].style.backgroundColor = colour;
        board[21].style.backgroundColor = colour;
        board[26].style.backgroundColor = colour;
        board[29].style.backgroundColor = colour;
        board[34].style.backgroundColor = colour;
        board[37].style.backgroundColor = colour;
        board[42].style.backgroundColor = colour;
        board[43].style.backgroundColor = colour;
        board[44].style.backgroundColor = colour;
        board[45].style.backgroundColor = colour;
        setTimeout(outer2, 500);
    }
    function outer2() {
        board[9].style.backgroundColor = colour;
        board[10].style.backgroundColor = colour;
        board[11].style.backgroundColor = colour;
        board[12].style.backgroundColor = colour;
        board[13].style.backgroundColor = colour;
        board[14].style.backgroundColor = colour;
        board[17].style.backgroundColor = colour;
        board[22].style.backgroundColor = colour;
        board[25].style.backgroundColor = colour;
        board[30].style.backgroundColor = colour;
        board[33].style.backgroundColor = colour;
        board[38].style.backgroundColor = colour;
        board[41].style.backgroundColor = colour;
        board[46].style.backgroundColor = colour;
        board[49].style.backgroundColor = colour;
        board[50].style.backgroundColor = colour;
        board[51].style.backgroundColor = colour;
        board[52].style.backgroundColor = colour;
        board[53].style.backgroundColor = colour;
        board[54].style.backgroundColor = colour;
        setTimeout(outer3, 500);
    }
    function outer3() {
        board[0].style.backgroundColor = colour;
        board[1].style.backgroundColor = colour;
        board[2].style.backgroundColor = colour;
        board[3].style.backgroundColor = colour;
        board[4].style.backgroundColor = colour;
        board[5].style.backgroundColor = colour;
        board[6].style.backgroundColor = colour;
        board[7].style.backgroundColor = colour;
        board[8].style.backgroundColor = colour;
        board[15].style.backgroundColor = colour;
        board[16].style.backgroundColor = colour;
        board[23].style.backgroundColor = colour;
        board[24].style.backgroundColor = colour;
        board[31].style.backgroundColor = colour;
        board[32].style.backgroundColor = colour;
        board[39].style.backgroundColor = colour;
        board[40].style.backgroundColor = colour;
        board[47].style.backgroundColor = colour;
        board[48].style.backgroundColor = colour;
        board[55].style.backgroundColor = colour;
        board[56].style.backgroundColor = colour;
        board[57].style.backgroundColor = colour;
        board[58].style.backgroundColor = colour;
        board[59].style.backgroundColor = colour;
        board[60].style.backgroundColor = colour;
        board[61].style.backgroundColor = colour;
        board[62].style.backgroundColor = colour;
        board[63].style.backgroundColor = colour;
        setTimeout(centerpiece, 500);
    }
    function centerpiece() {
        board[27].style.backgroundColor = "black";
        board[28].style.backgroundColor = "white";
        board[35].style.backgroundColor = "white";
        board[36].style.backgroundColor = "black";
        
        //black player starts
        turn[0].style.backgroundColor = "black";
        turn[0].style.border = "1px solid black";
        game();
    }
}

function game() {
    var board = document.getElementById("board").getElementsByTagName("td");
    var turn = document.getElementById("turntable").getElementsByTagName("td");
    //is run at the start of each turn
    //for each black/white tile on the board, check in all directions for white tiles. continue in that direction until you hit a blank tile which becomes a possible move.
    
    //Array that stores all possible places to move each turn
    var moves = [];
    //Array that stores the path of white pieces needed to get to each place in move
    var paths = [];
    
    //get opponent color
    var opponentColor;
    if (turn[0].style.backgroundColor == "black") {
        opponentColor = "white";
    } else {
        opponentColor = "black";
    }
    
    //for each piece the player has, get all possible moves.
    for (var i = 0; i < board.length; i++) {
        var color = board[i].style.backgroundColor;
        if (color == turn[0].style.backgroundColor) {
            getMoves(board[i].id);
        }
    }
    
    //console.log(paths);
    //console.log(moves);
    
    function getMoves(id) {
        var temppaths = [];
        var i = 0;
        checkdir(id,"N");
        var i = 0;
        checkdir(id,"NE");
        var i = 0;
        checkdir(id,"E");
        var i = 0;
        checkdir(id,"SE");
        var i = 0;
        checkdir(id,"S");
        var i = 0;
        checkdir(id,"SW");
        var i = 0;
        checkdir(id,"W");
        var i = 0;
        checkdir(id,"NW");
        function checkdir(id, direction) {
            if (direction == "N") {
                newid = Number(id) - 1;
            }
            if (direction == "NE") {
                newid = Number(id) + 9;
            }
            if (direction == "E") {
                newid = Number(id) + 10;
            }
            if (direction == "SE") {
                newid = Number(id) + 11;
            }
            if (direction == "S") {
                newid = Number(id) + 1;
            }
            if (direction == "SW") {
                newid = Number(id) - 9;
            }
            if (direction == "W") {
                newid = Number(id) - 10;
            }
            if (direction == "NW") {
                newid = Number(id) - 11;
            } 
            if (document.getElementById(newid)){
                if (document.getElementById(newid).style.backgroundColor == opponentColor){
                    i++;
                    temppaths.push("" + newid);
                    //console.log(temppaths + " " + i);
                    checkdir(newid, direction);
                } else { 
                    if (i > 0 && document.getElementById(newid).style.backgroundColor != opponentColor) {
                        if (document.getElementById(newid).style.backgroundColor != turn[0].style.backgroundColor) {
                            for (var z=0; z<temppaths.length; z++){
                            paths.push(temppaths[z]);
                            }
                            moves.push(newid);
                            paths.push(newid);
                            temppaths = [];
                        }
                    }
                }
            temppaths = [];
            }   
        }
    }
    //if no more moves for either player exist exist, endgame
    if (moves === undefined || moves.length == 0) {
            //console.log("game over");
            var b = 0;
            var w = 0;
            for (var v = 0; v < board.length; v++) {
                var cellColor = board[v].style.backgroundColor;
                if (cellColor == "black") {
                    b++;
                    }
                if (cellColor == "white") {
                    w++;
                }
            }
            var text = document.getElementById("over");
            if (b > w){
                if (player == 1){
                    $('#game .alert p').text("You Win! ( " + b + "," + w + ")").append($('<a class="pull-right" onclick="showRestart();"></a>').text('Click here for New Game'));
                }
                if (player == 2){
                    $('#game .alert p').text("You Lose! ( " + w + "," + b + ")").append($('<a class="pull-right" onclick="showRestart();"></a>').text('Click here for New Game'));
                }   
            }
            if (w > b){
                if (player == 1){
                    $('#game .alert p').text("You Lose! ( " + b + "," + w + ")").append($('<a class="pull-right" onclick="showRestart();"></a>').text('Click here for New Game'));
                }
                if (player == 2){
                    $('#game .alert p').text("You Win! ( " + w + "," + b + ")").append($('<a class="pull-right" onclick="showRestart();"></a>').text('Click here for New Game'));
                }
            }
            if (w == b){
                $('#game .alert p').text("Tie! ( " + w + "," + b + ")").append($('<a class="pull-right" onclick="showRestart();"></a>').text('Click here for New Game'));
            }    
    }
    
    connect.on('data', function(data) {
        switch(data[0]) {
            case 'move':
                if (myturn == false){
                $('#game .alert p').text('Your turn!');
                document.getElementById(data[1]).style.backgroundColor = turn[0].style.backgroundColor;
                myturn = true;
                flipPieces(Number(data[1]), data[2]);
                }
                break;
            case 'restart':
                $('#restart .opprstrt p').text("Opponent has accepted");
                if (restartPressed == true){
                    if (player == 1){
                        $('#game .alert p').text('Your Turn!');
                        $('#game').show().siblings('#restart').hide();
                        myturn = true;
                        start();
                    }
                    if (player == 2){
                        $('#game .alert p').text("Waiting for opponents move..");
                        $('#game').show().siblings('#restart').hide();
                        myturn = false;
                        start();
                    }           
                }
                break;
        }
    })
    connect.on('close', function() {
        if (moves !== undefined || moves.length !=0){
            $('#game .alert p').text("Opponent has left the game!")
        }
        myturn = false;
    })
    peer.on('error', function(error) {
        alert(''+error);
        myturn = false;
    })
    
    //for each possible move spot, mouseover will preveiw your color
    if (myturn == true) {
        var clicked = false;
        document.getElementById("board").style.pointerEvents = 'auto';
        moves.forEach(function(item, j){
                document.getElementById(moves[j]).onmouseover = function(){
                    if (clicked == false){
                        document.getElementById(moves[j]).style.backgroundColor = turn[0].style.backgroundColor;
                    }
                }
                document.getElementById(moves[j]).onmouseout = function(){
                    if (clicked == false){
                        document.getElementById(moves[j]).style.backgroundColor = colour;
                    }
                }
                document.getElementById(moves[j]).onclick = function(){            
                    clicked = true;
                    var picked = moves[j]; //
                    document.getElementById(moves[j]).style.backgroundColor = turn[0].style.backgroundColor;
                    $('#game .alert p').text("Waiting for Opponents Move");
                    myturn = false;
                    connect.send(['move', moves[j], paths]);
                    flipPieces(picked, paths);
                    turnOffEvents();
                }
        });
    }
    
    function turnOffEvents(){
        moves.forEach(function(item, j){
            document.getElementById(moves[j]).style.pointerEvents = 'none';
            //Event.onmouseover = null;
            //Event.onmouseout = null;
            //Event.onclick = null;
            //console.log(document.getElementById(moves[j]).style.pointerEvents);
        })
        for (var m = 0; m < board.length; m++) {
            $(document.getElementById(board[m])).unbind();
        }
    }
    
    function flipPieces(m, paths) {
        //console.log(paths + "in flip");
        var upperbound;
        var lowerbound;
        
        //returns all indexes of paths that contain the move coord
        //console.log(paths);
        function getAllIndexes(m){
            var indexes = [], n;
            for (n=0;n<paths.length;n++){
                if (paths[n] === m)
                    indexes.push(n);
            }
            //console.log(indexes);
            return indexes;
        }
        
        var indexes = getAllIndexes(m);
        //console.log(indexes);
        
        for (i=0; i<indexes.length; i++){
            for (var j = indexes[i]-1; j>=0; j--){
            if (j==0){
                upperbound = indexes[i];
                lowerbound = 0;
                break;
            }
            if (typeof paths[j] === 'number'){
                upperbound = indexes[i];
                lowerbound = j + 1;
                break;
                }
            }   
            for (var k=lowerbound; k<upperbound; k++){
                document.getElementById(paths[k]).style.backgroundColor = turn[0].style.backgroundColor;
            }
        }
        //console.log(upperbound + " " + lowerbound);
        switchTurn();
    }
    function switchTurn() {
            var turntxt = document.getElementById("turn");
            if (turn[0].style.backgroundColor == "white"){
                turn[0].style.backgroundColor = "black";
                turntxt.style.color = "white";
            } else {
              if (turn[0].style.backgroundColor == "black") {
                turn[0].style.backgroundColor = "white";
                turntxt.style.color = "black";
            }  
            }
            moves = [];
            paths = [];
            indexes = [];
            game();
        }
}