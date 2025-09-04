import SchemaModel from "../SchemaModel.js"
import AVSUtil from "../../lib/AVSUtil.js"

export default class UserGovData extends SchemaModel {
    static schema = {
        avs_number:         [AVSUtil.format, '', AVSUtil.check],
        marital_status:     [SchemaModel.toInteger, 0],
        pension_fund:       [SchemaModel.toString, ''],
        health_insurance:   [SchemaModel.toString, ''],
        accident_insurance: [SchemaModel.toString, '']
    }
}