function Grid(row, col) {
    this.Grid = []
    for (let i = 0; i < row; i++) {
        let r = []
        for (let j = 0; j < col; j++) {
            r.push(null)
        }
        this.Grid.push(r)
    }
}

Grid.prototype.getRow = function (idx) {
    if (idx < this.rowLength()) {
        return this.Grid[idx]
    }
    return null
}

Grid.prototype.getColumn = function (idx) {
    let column = []
    if (idx < this.colLength()) {
        for (let i = 0; i < this.rowLength(); i++) {
            column.push(this.getCell(i, idx))
        }
    }

    return column.length > 0 ? column : null
}

Grid.prototype.getCell = function (rowIdx, colIdx) {
    let row = this.getRow(rowIdx)
    if (row !== null) {
        if (colIdx < row.length) {
            return row[colIdx]
        }
    }

    return null
}

Grid.prototype.rowLength = function () {
    return this.Grid.length
}

Grid.prototype.colLength = function () {
    return this.Grid[0].length
}

Grid.prototype.addColumn = function (number) {
    const left = number < 0
    const count = Math.abs(number)
    if (count === 0) { return }

    for (let i = 0; i < this.Grid.length; i++) {
        for (let j = 0; j < count; j++) {
            if (left) {
                this.Grid[i].unshift(null)
            } else {
                this.Grid[i].push(null)
            }
        }
    }
}

Grid.prototype.removeColumn = function (number) {
    const left = number < 0
    const count = Math.abs(number)
    if (count === 0) { return }

    for (let i = 0; i < this.Grid.length; i++) {
        for (let j = 0; j < count; j++) {
            if (left) {
                this.Grid[i].shift(null)
            } else {
                this.Grid[i].pop(null)
            }
        }
    }
}

Grid.prototype.addRow = function (number) {
    const top = number > 0
    const count = Math.abs(number)
    if (count === 0) { return }

    const rowLength = this.Grid[0].length;

    for (let i = 0; i < count; i++) {
        let newRow = []
        for (let j = 0; j < rowLength; j++) {
            newRow.push(null)
        }
        if (top) {
            this.Grid.unshift(newRow)
        } else {
            this.Grid.push(newRow)
        }
    }

} 

