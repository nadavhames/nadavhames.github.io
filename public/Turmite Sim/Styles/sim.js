// +,- and clr button handling for state addition and removal
let states = 0;
var h = 100;
var w = 100;
var grid = [];
//grid init
for (let x = 0; x < h; x++) {
    grid.push([]);
    for (let y = 0; y < w; y++) {
        grid[x].push('white');
    }
}
//grid[50][50] = 'black';

function initGrid() {
    canvasGrid("canvas", grid);
}

function loadStates() {
    for (let i = 0; i <= 1; i++) {
        $('#stateContainer').append('<div class="input-group">\
        <div class="input-group-prepend">\
            <span class="input-group-text" id="Bl">State '+ i + '</span>\
        </div><select class="custom-select '+ i + '">\
            <option value="1" selected>B</option>\
            <option value="0">W</option>\
        </select><select class="custom-select '+ i + '">\
            <option value="8" selected>L</option>\
            <option value="2">R</option>\
            <option value="1">N</option>\
            <option value="4">U</option>\
        </select>\
        <input class="form-control '+ i + '" type="text"></input>\
        <div class="spacer"></div>\
        <select class="custom-select '+ i + '">\
            <option value="1" selected>B</option>\
            <option value="0">W</option>\
        </select>\
        <select class="custom-select '+ i + '">\
            <option value="8" selected>L</option>\
            <option value="2">R</option>\
            <option value="1">N</option>\
            <option value="4">U</option>\
        </select>\
        <input class="form-control '+ i + '" type="text"></input>\
        <div class="input-group-append">\
            <span class="input-group-text" id="Wh">State '+ i + '</span>\
        </div>\
        </div>');
        states = i;
    }
    getPreset();
}

function addState() {
    if (states <= 4) {
        states++;
        $('#stateContainer').append('<div class="input-group">\
    <div class="input-group-prepend">\
        <span class="input-group-text" id="Bl">State '+ states + '</span>\
    </div><select class="custom-select '+ states + '">\
        <option value="1" selected>B</option>\
        <option value="0">W</option>\
    </select><select class="custom-select '+ states + '">\
        <option value="8" selected>L</option>\
        <option value="2">R</option>\
        <option value="1">N</option>\
        <option value="4">U</option>\
    </select>\
    <input class="form-control '+ states + '" type="text"></input>\
    <div class="spacer"></div>\
    <select class="custom-select '+ states + '">\
        <option value="1" selected>B</option>\
        <option value="0">W</option>\
    </select>\
    <select class="custom-select '+ states + '">\
        <option value="8" selected>L</option>\
        <option value="2">R</option>\
        <option value="1">N</option>\
        <option value="4">U</option>\
    </select>\
    <input class="form-control '+ states + '" type="text"></input>\
    <div class="input-group-append">\
        <span class="input-group-text" id="Wh">State '+ states + '</span>\
    </div>\
</div>');
    }
}

function removeState() {
    if (states > 1) {
        $('#stateContainer .input-group:last').remove();
        states--;
    }
}

function getInstruction(colour, state) {
    //gets relevant instruction set from form given current colour being read and next state.
    let dropdowns = document.getElementsByClassName('custom-select ' + state + '');
    let inputs = document.getElementsByClassName('form-control ' + state + '');
    let instruction = [];
    if (colour == 'white') {
        instruction[0] = dropdowns[0].value;
        instruction[1] = dropdowns[1].value;
        instruction[2] = inputs[0].value;
    } else {
        instruction[0] = dropdowns[2].value;
        instruction[1] = dropdowns[3].value;
        instruction[2] = inputs[1].value;
    }
    return instruction;
}

let pressed = 0;
let paused = true;
function start() {
    let startButton = document.getElementById('start');
    if (startButton.style.backgroundColor != 'red') {
        startButton.textContent = 'Stop';
        startButton.style.backgroundColor = 'red';
    } else {
        startButton.textContent = 'Start';
        startButton.style.backgroundColor = 'black';
    }
    if (pressed == 0) {
        started();
        pressed = 1;
        paused = false;
    } else if (pressed == 1) {
        paused = true;
        pressed = 2;
    } else if (pressed = 2) {
        paused = false;
        pressed = 1;
    }
}

//on Start Button Press
function started() {
    let coords = [w / 2, h / 2];
    let currentDir = {
        dir: 'n',
        right: () => {
            switch (currentDir.dir) {
                case 'n':
                    currentDir.dir = 'e';
                    coords[1]++;
                    break;
                case 's':
                    currentDir.dir = 'w';
                    coords[1]--;
                    break;
                case 'e':
                    currentDir.dir = 's';
                    coords[0]++;
                    break;
                case 'w':
                    currentDir.dir = 'n';
                    coords[0]--;
                    break;
            }
        },
        u: () => {
            switch (currentDir.dir) {
                case 'n':
                    currentDir.dir = 's';
                    coords[0]++;
                    break;
                case 's':
                    currentDir.dir = 'n';
                    coords[0]--;
                    break;
                case 'e':
                    currentDir.dir = 'w';
                    coords[1]--;
                    break;
                case 'w':
                    currentDir.dir = 'e';
                    coords[1]++;
                    break;
            }
        },
        left: () => {
            switch (currentDir.dir) {
                case 'n':
                    currentDir.dir = 'w';
                    coords[1]--;
                    break;
                case 's':
                    currentDir.dir = 'e';
                    coords[1]++;
                    break;
                case 'e':
                    currentDir.dir = 'n';
                    coords[0]--;
                    break;
                case 'w':
                    currentDir.dir = 's';
                    coords[0]++;
                    break;
            }
        },
        n: () => {
            switch (currentDir.dir) {
                case 'n':
                    coords[0]--;
                    break;
                case 's':
                    coords[0]++;
                    break;
                case 'e':
                    coords[1]++;
                    break;
                case 'w':
                    coords[1]--;
                    break;
            }
        }
    }

    let timeStep = document.getElementById('timeSteps').value;
    let count = 0;
    let colour = grid[coords[0]][coords[1]];
    grid[coords[0]][coords[1]] = 'red';
    let currentRules = getInstruction(colour, 0);
    setInterval(() => {
        if (paused) {
            return;
        } else {
            //timeStep = document.getElementById('timeSteps').value;
            if (currentRules[0] == 1) {
                grid[coords[0]][coords[1]] = 'black';
            } else {
                grid[coords[0]][coords[1]] = 'white';
            }

            if (currentRules[1] == 1) {
                currentDir.n();
            } else if (currentRules[1] == 2) {
                currentDir.right();
            } else if (currentRules[1] == 4) {
                currentDir.u();
            } else if (currentRules[1] == 8) {
                currentDir.left();
            }

            colour = grid[coords[0]][coords[1]];
            grid[coords[0]][coords[1]] = 'red';
            //console.log("facing "+currentDir.dir +' go to state ' + currentRules[2] + " new square is " + colour + " " + count);
            currentRules = getInstruction(colour, currentRules[2]);
            callWatchers(grid, function () { draw(); });
            count++;
        } 
    }, timeStep);
    
}

function clearCanvas() {
    for (let x = 0; x < h; x++) {
        for (let y = 0; y < w; y++) {
            grid[x][y] = ('white');
        }
    }
    callWatchers(grid, function () { draw(); });
}

//get value from preset selector and set dropdowns to correct values
function getPreset() {
    //legend: |change to black/white|1=noturn, 2=right, 4=u-turn, 8=left|next state, move foreward one square 
    let defaultInterval = 10;
    let spiral = [[[1, 1, 1], [1, 8, 0]],
    [[1, 2, 1], [0, 1, 0]]];
    let snowflake = [[[1, 8, 1], [1, 2, 0]],
    [[1, 4, 1], [1, 4, 2]],
    [['-'], [0, 4, 0]]];
    let fibonacci = [[[1, 8, 1], [1, 8, 1]],
    [[1, 2, 1], [0, 1, 0]]]
    let texture = [[[1, 2, 1], [1, 8, 1]],
    [[1, 2, 1], [0, 2, 0]]];
    let frame = [[[1, 8, 0], [1, 2, 1]],
    [[0, 2, 0], [0, 8, 1]]];
    let semichaotic = [[[1, 2, 0], [1, 2, 1]],
    [[0, 1, 0], [0, 1, 1]]];

    let value = $('#inputGroupSelect :selected').text();
    document.getElementById('timeSteps').value = defaultInterval;

    let current = [];
    switch (value) {
        case 'Spiral':
            current = spiral;
            break;
        case 'Snowflake':
            current = snowflake;
            break;
        case 'Fibonacci':
            current = fibonacci;
            break;
        case 'Texture':
            current = texture;
            break;
        case 'Frame':
            current = frame;
        case 'Semichaotic':
            current = semichaotic;
    }
    //ensure states stored are displayed
    if (value != 'Custom') {
        while (states != current.length - 1) {
            if (states < current.length - 1) {
                addState();
            }
            if (states > current.length - 1) {
                removeState();
            }
        }

        //for each row set dropdowns and inputs to corresponding values
        for (let i = 0; i <= states; i++) {
            let dropdowns = document.getElementsByClassName('custom-select ' + i + '');
            let inputs = document.getElementsByClassName('form-control ' + i + '');
            if (current[i][0].length > 0) {
                //first two dropdowns
                dropdowns[0].value = current[i][0][0];
                dropdowns[1].value = current[i][0][1];
                //set state input
                inputs[0].value = current[i][0][2];
            }
            if (current[i][1].length > 0) {
                //second two drop downs
                dropdowns[2].value = current[i][1][0];
                dropdowns[3].value = current[i][1][1];
                //set state input
                inputs[1].value = current[i][1][2];
            }
        }
    }

}