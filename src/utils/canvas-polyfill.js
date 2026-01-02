import { createCanvas } from 'canvas'

global.DOMMatrix = class DOMMatrix {
    constructor() {
        this.a = 1
        this.b = 0
        this.c = 0
        this.d = 1
        this.e = 0
        this.f = 0
    }

    scale(sx, sy) {
        return this
    }

    translate(tx, ty) {
        return this
    }
}

const canvas = createCanvas(100, 100)
global.ImageData = canvas.getContext('2d').createImageData(1, 1).constructor
global.Path2D = class Path2D { }
