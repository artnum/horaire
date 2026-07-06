export default class FileExtension {
    static fromMimetype(mimetype) {
        mimetype = mimetype.split(';')[0].trim()
        switch(mimetype) {
            default: {
                const type = mimetype.split('/')[0].trim()
                const subtype = mimetype.split('/')[1].trim()
                const suffix = subtype.split('+')[1].split(';')[0].trim()
                switch(type) {
                    case 'text': return 'txt'
                    default: {
                        switch(suffix) {
                            case 'xml' : return 'xml'
                            case 'json': return 'json'
                            case 'zip' : return 'zip'
                            case 'gzip': return 'gz'
                            default    : return 'bin'
                        }
                    } break
                }
            } break
            case 'application/x-7z-compressed': return '7z'
            case 'video/3gpp2': case 'audio/3gpp2': return '3g2'
            case 'video/3gpp': case 'audio/3gpp': return '3gp'
            case 'application/zip': case 'application/x-zip-compressed': return 'zip'
            case 'application/xml': case 'text/xml': return 'xml'
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return 'xlsx'
            case 'application/vnd.ms-excel': return 'xls'
            case 'application/xhtml+xml': return 'xhtml'
            case 'font/woff2': return 'woff2'
            case 'font/woff': return 'woff'
            case 'image/webp': return 'webp'
            case 'application/manifest+json': return 'webmanifest'
            case 'video/webm': return 'webm'
            case 'audio/webm': return 'weba'
            case 'audio/wav': return 'wav'
            case 'application/vnd.visio': return 'vsd'
            case 'text/plain': return 'txt'
            case 'font/ttf': return 'ttf'
            case 'application/x-tar': return 'tar'
            case 'image/svg+xml': return 'svg'
            case 'application/rtf': return 'rtf'
            case 'application/vnd.rar': return 'rar'
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': return 'pptx'
            case 'application/vnd.ms-powerpoint': return 'ppt'
            case 'application/pdf': return 'pdf'
            case 'image/png': return 'png'
            case 'font/otf': return 'otf'
            case 'audio/ogg': return 'opus'
            case 'application/ogg': return 'ogx'
            case 'video/ogg': return 'ogv'
            case 'audio/ogg': return 'oga'
            case 'application/vnd.oasis.opendocument.text': return 'odt'
            case 'application/vnd.oasis.opendocument.spreadsheet': return 'ods'
            case 'application/vnd.oasis.opendocument.presentation': return 'odp'
            case 'video/mpeg': return 'mpeg'
            case 'video/mp4': return 'mp4'
            case 'text/markdown': return 'md'
            case 'application/json': return 'json'
            case 'application/ld+json': return 'jsonld'
            case 'image/jpeg': return 'jpeg'
            case 'text/calendar': return 'ics'
            case 'text/html': return 'html'
            case 'image/gif': return 'gif'
            case 'application/x-gzip': case 'application/gzip': return 'gz'
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'docx'
            case 'application/msword': return 'doc'
            case 'text/csv': return 'csv'
            case 'text/css': return 'css'
            case 'application/x-bzip2': return 'bz2'
            case 'application/x-bzip': return 'bz'
            case 'image/bmp': return 'bmp'
            case 'application/octet-stream': return 'bin'
            case 'video/x-msvideo': return 'avi'
            case 'image/avif': return 'avifa'
            case 'image/apng': return 'apng'
            case 'application/x-abiword': return 'abw'
            case 'audio/aac': return 'aac'
        }
    }
}
