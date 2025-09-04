import SchemaModel from "../SchemaModel.js"

export default class UserChildData extends SchemaModel {
    static schema = {
        name:         [SchemaModel.toString, ''],
        birthday:     [SchemaModel.toString, 0],
        residency:    [SchemaModel.toString, ''],
        education:    [SchemaModel.toString, '']
    }
}