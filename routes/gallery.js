var express = require('express');
var router = express.Router();

const fs = require('fs')
const sharp = require('sharp')
const path = require('path')

function makeGalleryRouter(galleryDir) {

    function readFolder(subdir) {
        return new Promise((resolve, reject) => {
            fs.readdir(path.join(galleryDir, subdir), {withFileTypes: true}, (err, data) => {
                if (err)
                    reject(err)
                else {
                    let content = {folders: [], images: []}
                    data.forEach(dirent => {
                        if (dirent.isDirectory())
                            content.folders.push(dirent.name)
                        else if (dirent.isFile())
                            content.images.push(dirent.name)
                    })
                    resolve(content)
                }
            })
        })
    }

    let pathRouter = express.Router()
    pathRouter
        .get(/.*/, function(req, res, next) {
            readFolder(req.path).then((content) => {
                res.render('gallery', { path: req.path, content: content })
            },
            () => res.sendStatus(500))
        })

    function getImage(relFilePath, size, res, next) {
        let {width: ww, height: wh} = size
        const wr = ww / wh
        const image = sharp(path.join(galleryDir, relFilePath))
        let handleError = err => {
            console.log(err)
            next(err)
        }
        image.metadata().then(
            metadata => {
                let {width: iw, height: ih} = metadata
                let rotated = metadata.orientation && ((metadata.orientation & 1) === 0)
                const ir = rotated? ih / iw: iw / ih
                image
                    .resize({width: Math.round(ir > wr? ww: wh*ir)})
                    .rotate()
                    .jpeg()
                    .toBuffer()
                    .then(
                        data => {
                            res.contentType('jpeg').write(data, 'binary')
                            res.end()
                        },
                        handleError
                    )
            },
            handleError
        )
}

    let imageRouter = express.Router()
    imageRouter
        .get(/.*/, function(req, res, next) {
            getImage(decodeURI(req.path), req.query, res, next)
        })

    let previewRouter = express.Router()
    previewRouter
        .get(/.*/, function(req, res, next) {
            getImage(decodeURI(req.path), {width: 90, height: 90}, res, next)
        })
    
    router
        .use('/gallery', pathRouter)
        .use('/image', imageRouter)
        .use('/preview', previewRouter)

    return router
}

module.exports = makeGalleryRouter
