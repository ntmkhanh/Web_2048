function KeyboardInputManager() {
    this.events = {};
    this.listen();
  }
  
  KeyboardInputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  };
  
  KeyboardInputManager.prototype.emit = function (event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach(function (callback) {
        callback(data);
      });
    }
  };
  
  KeyboardInputManager.prototype.listen = function () {
    var self = this;
  
    var map = {
      38: 0, // Up
      39: 1, // Right
      40: 2, // Down
      37: 3, // Left
      87: 0, // W
      68: 1, // D
      83: 2, // S
      65: 3  // A
    };
  
    // Phản hồi phím di chuyển
    document.addEventListener("keydown", function (event) {
      var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                      event.shiftKey;
      var mapped    = map[event.which];
  
      // Ignore the event if it's happening in a text field
      if (self.targetIsInput(event)) return;
  
      if (!modifiers) {
        if (mapped !== undefined) {
          event.preventDefault();
          self.emit("move", mapped);
        }
      }
    });
  
    // phản hồi các lần bấm nút
    this.bindButtonPress(".retry-button", this.restart);
    this.bindButtonPress(".restart-button", this.restart);
    this.bindButtonPress(".keep-playing-button", this.keepPlaying);
  
    // phản hồi sự kiện vuốt
    var touchStartClientX, touchStartClientY;
    var gameContainer = document.getElementsByClassName("game-container")[0];
  
    gameContainer.addEventListener(this.eventTouchstart, function (event) {
      if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
          event.targetTouches > 1 ||
          self.targetIsInput(event)) {
        return; // Bỏ qua nếu chạm nhiều hơn 1 ngón tay hoặc chạm vào đầu vào
      }
  
      if (window.navigator.msPointerEnabled) {
        touchStartClientX = event.pageX;
        touchStartClientY = event.pageY;
      } else {
        touchStartClientX = event.touches[0].clientX;
        touchStartClientY = event.touches[0].clientY;
      }
  
      event.preventDefault();
    });
  
    gameContainer.addEventListener(this.eventTouchmove, function (event) {
      event.preventDefault();
    });
  
    gameContainer.addEventListener(this.eventTouchend, function (event) {
      if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
          event.targetTouches > 0 ||
          self.targetIsInput(event)) {
        return; // Bỏ qua nếu vẫn chạm bằng một hoặc nhiều ngón tay hoặc đầu vào
      }
  
      var touchEndClientX, touchEndClientY;
  
      if (window.navigator.msPointerEnabled) {
        touchEndClientX = event.pageX;
        touchEndClientY = event.pageY;
      } else {
        touchEndClientX = event.changedTouches[0].clientX;
        touchEndClientY = event.changedTouches[0].clientY;
      }
  
      var dx = touchEndClientX - touchStartClientX;
      var absDx = Math.abs(dx);
  
      var dy = touchEndClientY - touchStartClientY;
      var absDy = Math.abs(dy);
  
      if (Math.max(absDx, absDy) > 10) {
        // (right : left) : (down : up)
        self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
      }
    });
  };
  // chúng ta sẽ gọi this.$emit("my-event") từ component con khi chúng ta muốn kích hoạt event nào đó để thay đổi data của cha truyền xuống con.
  KeyboardInputManager.prototype.restart = function (event) {
    event.preventDefault();
    this.emit("restart");
  };
  
  KeyboardInputManager.prototype.keepPlaying = function (event) {
    event.preventDefault();
    this.emit("keepPlaying");
  };
  
  KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
    var button = document.querySelector(selector);
    button.addEventListener("click", fn.bind(this));
    button.addEventListener(this.eventTouchend, fn.bind(this));
  };
  
  KeyboardInputManager.prototype.targetIsInput = function (event) {
    return event.target.tagName.toLowerCase() === "input";
  };
  //Phương thức querySelector() trả về phần tử đầu tiên là phần tử con của phần tử mà nó được gọi ra khớp với nhóm bộ chọn được chỉ định.
  function HTMLActuator() {
    this.tileContainer    = document.querySelector(".tile-container");
    this.scoreContainer   = document.querySelector(".score-container");
    this.bestContainer    = document.querySelector(".best-container");
    this.messageContainer = document.querySelector(".game-message");
    this.sharingContainer = document.querySelector(".score-sharing");
  
    this.score = 0;
  }
  
  HTMLActuator.prototype.actuate = function (grid, metadata) {
    var self = this;
  
    window.requestAnimationFrame(function () {
      self.clearContainer(self.tileContainer);
  
      grid.cells.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) {
            self.addTile(cell);
          }
        });
      });
  
      self.updateScore(metadata.score);
      self.updateBestScore(metadata.bestScore);
  
      if (metadata.terminated) {
        if (metadata.over) {
          self.message(false); // You lose
        } else if (metadata.won) {
          self.message(true); // You win!
        }
      }
  
    });
  };
  
  // Continues the game (both restart and keep playing)
  HTMLActuator.prototype.continueGame = function () {
    this.clearMessage();
  };
  //Remove all child nodes from container
  HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };
  

  HTMLActuator.prototype.tileHTML = ["2", "4", "8", "16", "32", "64", "128", "256", "512", "1024", "2048", "4096"];
 
  HTMLActuator.prototype.addTile = function (tile) {
    var self = this;
  
    var wrapper   = document.createElement("div");
    var inner     = document.createElement("div");
    var position  = tile.previousPosition || { x: tile.x, y: tile.y };
    var positionClass = this.positionClass(position);
  
    // We can't use classlist because it somehow glitches when replacing classes
    var classes = ["tile", "tile-" + tile.value, positionClass];
  
    if (tile.value > 2048) classes.push("tile-super");
  
    this.applyClasses(wrapper, classes);
  
    inner.classList.add("tile-inner");
    inner.textContent = HTMLActuator.prototype.tileHTML[Math.log(tile.value) / Math.LN2 - 1] || tile.value;
  
    if (tile.previousPosition) {
      // Đảm bảo rằng ô được hiển thị ở vị trí trước đó trước tiên
      window.requestAnimationFrame(function () {
        classes[2] = self.positionClass({ x: tile.x, y: tile.y });
        self.applyClasses(wrapper, classes); // Update the position
      });
    } else if (tile.mergedFrom) {
      classes.push("tile-merged");
      this.applyClasses(wrapper, classes);
  
      // Render the tiles that merged
      tile.mergedFrom.forEach(function (merged) {
        self.addTile(merged);
      });
    } else {
      classes.push("tile-new");
      this.applyClasses(wrapper, classes);
    }
  
    // Add the inner part of the tile to the wrapper
    wrapper.appendChild(inner);
  
    // Put the tile on the board
    this.tileContainer.appendChild(wrapper);
  };
  //Phương setAttribute()thức đặt một giá trị mới cho một thuộc tính.
  HTMLActuator.prototype.applyClasses = function (element, classes) {
    element.setAttribute("class", classes.join(" "));
  };
  
  HTMLActuator.prototype.normalizePosition = function (position) {
    return { x: position.x + 1, y: position.y + 1 };
  };
  
  HTMLActuator.prototype.positionClass = function (position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
  };
  
  HTMLActuator.prototype.updateScore = function (score) {
    this.clearContainer(this.scoreContainer);
  
    var difference = score - this.score;
    this.score = score;
  
    this.scoreContainer.textContent = this.score;
  
    if (difference > 0) {
      var addition = document.createElement("div");
      addition.classList.add("score-addition");
      addition.textContent = "+" + difference;
  
      this.scoreContainer.appendChild(addition);
    }
  };
  
  HTMLActuator.prototype.updateBestScore = function (bestScore) {
    this.bestContainer.textContent = bestScore;
  };
  
  HTMLActuator.prototype.message = function (won) {
    var type    = won ? "game-won" : "game-over";
    var message = won ? "You Win!" : "Game Over!";
  
    this.messageContainer.classList.add(type);//type nhận gia 1 trong 2 giá trị
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;
  };
  
  HTMLActuator.prototype.clearMessage = function () {
    // IE only takes one value to remove at a time.
    this.messageContainer.classList.remove("game-won");
    this.messageContainer.classList.remove("game-over");
  };
  /* Game board*/
  function Grid(size, previousState) {
    this.size = size;
    this.cells = previousState ? this.fromState(previousState) : this.empty();
  }
  
  // Build a grid of the specified size
  Grid.prototype.empty = function () {
    var cells = [];
  
    for (var x = 0; x < this.size; x++) {
      var row = cells[x] = [];
  
      for (var y = 0; y < this.size; y++) {
        row.push(null);
      }
    }
  
    return cells;
  };
  //push() được sử dụng để thêm một hoặc nhiều phần tử vào trong mảng.
  Grid.prototype.fromState = function (state) {
    var cells = [];
  
    for (var x = 0; x < this.size; x++) {
      var row = cells[x] = [];
  
      for (var y = 0; y < this.size; y++) {
        var tile = state[x][y];
        row.push(tile ? new Tile(tile.position, tile.value) : null);
      }
    }
  
    return cells;
  };
  
// Tìm vị trí ngẫu nhiên có sẵn đầu tiên
  Grid.prototype.randomAvailableCell = function () {
    var cells = this.availableCells();
  
    if (cells.length) {
      return cells[Math.floor(Math.random() * cells.length)];
    }
  };
  
  Grid.prototype.availableCells = function () {
    var cells = [];
  
    this.eachCell(function (x, y, tile) {
      if (!tile) {
        cells.push({ x: x, y: y });
      }
    });
  
    return cells;
  };
  
  // Call callback for every cell
  Grid.prototype.eachCell = function (callback) {
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        callback(x, y, this.cells[x][y]);
      }
    }
  };
  
  // Kiểm tra xem có ô nào còn trống không
  Grid.prototype.cellsAvailable = function () {
    return !!this.availableCells().length;
  };
  
  // Kiểm tra xem ô đã chỉ định có được sử dụng hay không
  Grid.prototype.cellAvailable = function (cell) {
    return !this.cellOccupied(cell);
  };
  
  Grid.prototype.cellOccupied = function (cell) {
    return !!this.cellContent(cell);
  };
  
  Grid.prototype.cellContent = function (cell) {
    if (this.withinBounds(cell)) {
      return this.cells[cell.x][cell.y];
    } else {
      return null;
    }
  };
  
  // Chèn một ô vào vị trí của nó
  Grid.prototype.insertTile = function (tile) {
    this.cells[tile.x][tile.y] = tile;
  };
  
  Grid.prototype.removeTile = function (tile) {
    this.cells[tile.x][tile.y] = null;
  };
  
  Grid.prototype.withinBounds = function (position) {
    return position.x >= 0 && position.x < this.size &&
           position.y >= 0 && position.y < this.size;
  };
  
  Grid.prototype.serialize = function () {
    var cellState = [];
  
    for (var x = 0; x < this.size; x++) {
      var row = cellState[x] = [];
  
      for (var y = 0; y < this.size; y++) {
        row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
      }
    }
  
    return {
      size: this.size,
      cells: cellState
    };
  };
  function Tile(position, value) {
    this.x                = position.x;
    this.y                = position.y;
    this.value            = value || 2;
  
    this.previousPosition = null;
    this.mergedFrom       = null; // Tracks tiles that merged together(Theo dõi các ô đã hợp nhất với nhau)
  }
  
  Tile.prototype.savePosition = function () {
    this.previousPosition = { x: this.x, y: this.y };
  };
  
  Tile.prototype.updatePosition = function (position) {
    this.x = position.x;
    this.y = position.y;
  };
  
  Tile.prototype.serialize = function () {
    return {
      position: {
        x: this.x,
        y: this.y
      },
      value: this.value
    };
  };
  window.fakeStorage = {
    _data: {},
  /*
    setItem: function (id, val) {
      return this._data[id] = String(val);
    },
  
    getItem: function (id) {
      return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
    },
  
    removeItem: function (id) {
      return delete this._data[id];
    },
  
    clear: function () {
      return this._data = {};
    }
    */
  };
  
  //luu game trc đó
  function LocalStorageManager() {
    this.bestScoreKey     = "bestScore";
    this.gameStateKey     = "gameState";
  
    var supported = this.localStorageSupported();
    this.storage = supported ? window.localStorage : window.fakeStorage;
  }
  
  LocalStorageManager.prototype.localStorageSupported = function () {
    var testKey = "test";
    var storage = window.localStorage;
  
    try {
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Điểm cao nhất
  LocalStorageManager.prototype.getBestScore = function () {
    return this.storage.getItem(this.bestScoreKey) || 0;
  };
  
  LocalStorageManager.prototype.setBestScore = function (score) {
    this.storage.setItem(this.bestScoreKey, score);
  };
  
  // Trạng thái trò chơi nhận và xóa
  LocalStorageManager.prototype.getGameState = function () {
    var stateJSON = this.storage.getItem(this.gameStateKey);
    return stateJSON ? JSON.parse(stateJSON) : null;
  };
  
  LocalStorageManager.prototype.setGameState = function (gameState) {
    this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
  };
  
  LocalStorageManager.prototype.clearGameState = function () {
    this.storage.removeItem(this.gameStateKey);
  };
  function GameManager(size, InputManager, Actuator, StorageManager) {
    this.size           = size; // Size of the grid
    this.inputManager   = new InputManager;
    this.storageManager = new StorageManager;
    this.actuator       = new Actuator;
  
    this.startTiles     = 2;
  
    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
    this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  
    this.setup();
  }
  
  // Restart trò chơi
  GameManager.prototype.restart = function () {
    this.storageManager.clearGameState();
    this.actuator.continueGame(); // Xóa thông báo win/lose 
    this.setup();
  };
  
  // Cho phép tiếp tục chơi sau khi win 
  GameManager.prototype.keepPlaying = function () {
    this.keepPlaying = true;
    this.actuator.continueGame(); // Xóa thông báo win/lose
  };
  
  // Trả về giá trị true nếu game thua, hoặc false nếu người dùng thắng và không chơi tiếp
  GameManager.prototype.isGameTerminated = function () {
    if (this.over || (this.won && !this.keepPlaying)) {
      return true;
    } else {
      return false;
    }
  };
  
  // setup trò chơi
  GameManager.prototype.setup = function () {
    var previousState = this.storageManager.getGameState();
  
    // Tải lại trò chơi có sẵn trước đó, nếu có
    if (previousState) {
      this.grid        = new Grid(previousState.grid.size,
                                  previousState.grid.cells); // Tải lại lưới trò chơi
      this.score       = previousState.score;
      this.over        = previousState.over;
      this.won         = previousState.won;
      this.keepPlaying = previousState.keepPlaying;
    } else {
      this.grid        = new Grid(this.size);
      this.score       = 0;
      this.over        = false;
      this.won         = false;
      this.keepPlaying = false;
  
      // thêm các ô ban đầu
      this.addStartTiles();
    }
  
    //Cập nhật trạng thái
    this.actuate();
  };
  
  // setup các ô ban đầu để thiết lập trò chơi
  GameManager.prototype.addStartTiles = function () {
    for (var i = 0; i < this.startTiles; i++) {
      this.addRandomTile();
    }
  };
  
  // Thêm 1 ô 2 hoặc 4 vào vị trí ngẫu nhiên
  GameManager.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
      var value = Math.random() < 0.9 ? 2 : 4;
      var tile = new Tile(this.grid.randomAvailableCell(), value);
  
      this.grid.insertTile(tile);
    }
  };
  
  // Sends the updated grid to the actuator
  //Gửi lưới đã cập nhật tới thiết bị truyền động
  GameManager.prototype.actuate = function () {
    if (this.storageManager.getBestScore() < this.score) {
      this.storageManager.setBestScore(this.score);
    }
  
    // Xóa trạng thái khi trò chơi kết thúc (game over only, not win)
    if (this.over) {
      this.storageManager.clearGameState();
    } else {
      this.storageManager.setGameState(this.serialize());
    }
  
    this.actuator.actuate(this.grid, {
      score:      this.score,
      over:       this.over,
      won:        this.won,
      bestScore:  this.storageManager.getBestScore(),
      terminated: this.isGameTerminated()
    });
  
  };
  
  // Represent the current game as an object
  // Biểu diễn trò chơi hiện tại dưới dạng một đối tượng
  GameManager.prototype.serialize = function () {
    return {
      grid:        this.grid.serialize(),
      score:       this.score,
      over:        this.over,
      won:         this.won,
      keepPlaying: this.keepPlaying
    };
  };
  
  // Lưu tất cả các vị trí ô và xóa thông tin hợp nhất
  GameManager.prototype.prepareTiles = function () {
    this.grid.eachCell(function (x, y, tile) {
      if (tile) {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    });
  };
  
  // Di chuyển một ô và biểu diễn của nó
  GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  };
  
  // Di chuyển các ô trên lưới theo hướng đã chỉ định
  GameManager.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;
  
    if (this.isGameTerminated()) return; // Đừng làm bất cứ điều gì nếu trò chơi kết thúc
  
    var cell, tile;
  
    var vector     = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved      = false;
  
    // Lưu các vị trí ô hiện tại và xóa thông tin merger 
    this.prepareTiles();
  
    // Di chuyển lưới theo đúng hướng và di chuyển các ô
    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        cell = { x: x, y: y };
        tile = self.grid.cellContent(cell);
  
        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next      = self.grid.cellContent(positions.next);
  
          // Only one merger per row traversal?
          if (next && next.value === tile.value && !next.mergedFrom) {
            var merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];
  
            self.grid.insertTile(merged);
            self.grid.removeTile(tile);
  
            // Converge the two tiles' positions
            //Hội tụ các vị trí của hai ô
            tile.updatePosition(positions.next);
  
            // Update the score
            self.score += merged.value;
  
            // The mighty 2048 tile
            if (merged.value === 2048) self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }
  
          if (!self.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });
  
    if (moved) {
      this.addRandomTile();
  
      if (!this.movesAvailable()) {
        this.over = true; // Game over!
      }
  
      this.actuate();
    }
  };
  
  // Lấy vectơ đại diện cho hướng đã chọn
  GameManager.prototype.getVector = function (direction) {
    // Vectơ đại diện cho chuyển động của ô
    var map = {
      0: { x: 0,  y: -1 }, // Up
      1: { x: 1,  y: 0 },  // Right
      2: { x: 0,  y: 1 },  // Down
      3: { x: -1, y: 0 }   // Left
    };
  
    return map[direction];
  };
  
  // Xây dựng danh sách các vị trí để duyệt theo đúng thứ tự
  GameManager.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };
  
    for (var pos = 0; pos < this.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }
  
    //Luôn đi qua ô xa nhất theo hướng đã chọn
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();
  
    return traversals;
  };
  
  GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;
  
    // Tiến về hướng vectơ cho đến khi tìm thấy chướng ngại vật
    do {
      previous = cell;
      cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));
  
    return {
      farthest: previous,
      next: cell //Được sử dụng để kiểm tra xem có cần hợp nhất hay không
    };
  };
  
  GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  };
  
  // Check for available matches between tiles (more expensive check)
  //Kiểm tra các kết quả phù hợp có sẵn giữa các ô (kiểm tra đắt hơn)
  GameManager.prototype.tileMatchesAvailable = function () {
    var self = this;
  
    var tile;
  
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        tile = this.grid.cellContent({ x: x, y: y });
  
        if (tile) {
          for (var direction = 0; direction < 4; direction++) {
            var vector = self.getVector(direction);
            var cell   = { x: x + vector.x, y: y + vector.y };
  
            var other  = self.grid.cellContent(cell);
  
            if (other && other.value === tile.value) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }
  
    return false;
  };
  
  GameManager.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
  };
  // Wait till the browser is ready to render the game (avoids glitches)
  window.requestAnimationFrame(function () {
    new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  });