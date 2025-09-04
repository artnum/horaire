import SchemaModel from "../SchemaModel.js"

export default class UserKeyOpt extends SchemaModel {
    static schema = {
        algorithm:  [SchemaModel.toString, ''],
        iterations: [SchemaModel.toInteger, 0],
        salt:       [SchemaModel.toBase64, '']
    }
}