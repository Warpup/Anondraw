var CACHE_LENGTH = 4000; //How many drawings are saved

function DrawTogether (background) {
	this.drawings = {};
	this.paths = {};
	this.background = background;
}

DrawTogether.prototype.addDrawing = function addDrawing (room, drawing, callback) {
	// Put the given drawing in the database for the given room
	this.drawings[room] = this.drawings[room] || [];
	this.drawings[room].currentParts = this.drawings[room].currentParts || 0;
	this.drawings[room].push(drawing);
	this.drawings[room].currentParts += drawing.points ? drawing.points.length : 1;

	if (this.drawings[room].currentParts > CACHE_LENGTH && !this.drawings[room].sending) {
		// Make sure we wait till the server responded
		this.drawings[room].sending = true;
		this.drawings[room].sendLength = this.drawings[room].length;

		this.background.sendDrawings(room, this.drawings[room], function (err) {
			this.drawings[room].splice(0, this.drawings[room].sendLength);

			// Reset the amount of parts, we recount instead of
			// subtracting what we send to ensure it never goes out of sync
			this.drawings[room].currentParts = this.countParts(this.drawings[room]);
			
			console.log("Room " + room + " synced.");
			this.drawings[room].sending = false;

			if (err) {
				console.log("[SENDDRAWING][ERROR] ", err);
				return;
			}
		}.bind(this));
	}

	callback();
};

DrawTogether.prototype.countParts = function countParts (drawingList) {
	var size = 0;

	for (var k = 0; k < drawingList.length; k++)
		size += drawingList[k].points ? drawingList[k].points.length : 1;

	return size;
};

DrawTogether.prototype.addPath = function addPath (room, id, props) {
	this.paths[room] = this.paths[room] || {};
	this.finalizePath(room, id);
	this.paths[room][id] = props;
};

DrawTogether.prototype.addPathPoint = function addPathPoint (room, id, point) {
	if (!this.paths[room] || !this.paths[room][id]) return false;
	this.paths[room][id].points = this.paths[room][id].points || [];
	this.paths[room][id].points.push(point);
	return true;
};

DrawTogether.prototype.finalizePath = function finalizePath (room, id, callback) {
	if (!this.paths[room] || !this.paths[room][id]) return;
	callback = callback || function () {};
	this.addDrawing(room, this.paths[room][id], callback);
	this.removePath(room, id);
};

DrawTogether.prototype.removePath = function removePath (room, id) {
	delete this.paths[room][id];
};

DrawTogether.prototype.sqDistance = function sqDistance (point1, point2) {
	var xDist = point1[0] - point2[0];
	var yDist = point1[1] - point2[1];
	return xDist * xDist + yDist * yDist;
};

DrawTogether.prototype.getDrawings = function getDrawings (room, callback) {
	// Return a list of network transmittable drawings
	callback(null, this.drawings[room] || []);
};

DrawTogether.prototype.getPaths = function getPaths (room, callback) {
	callback(null, this.paths[room] || {});
};

DrawTogether.prototype.inkUsageFromDrawing = function inkUsageFromDrawing (drawing) {
	// If its a brush the ink usage is (size * size)
	// If it is a line the ink usage is (size * length * 2)
	var length = drawing.size;

	if (typeof drawing.x1 == "number")
		length = this.utils.distance(drawing.x, drawing.y, drawing.x1, drawing.y1) * 2;

	return Math.ceil(drawing.size * length / 100);
};

// Returns the inkusage for a pathpoint
// (point1, point2, size) or (point1, undefined, size)
DrawTogether.prototype.inkUsageFromPath = function inkUsageFromPath (point1, point2, size) {
	var length = size + (point2 ? this.utils.distance(point1[0], point1[1], point2[0], point2[1]) : 0);
	return Math.ceil(size * length / 100);
};

DrawTogether.prototype.utils = {
	distance: function (x1, y1, x2, y2) {
		// Returns the distance between (x1, y1) and (x2, y2)
		var xDis = x1 - x2,
		    yDis = y1 - y2;
		return Math.sqrt(xDis * xDis + yDis * yDis);
	}
};

module.exports = DrawTogether;