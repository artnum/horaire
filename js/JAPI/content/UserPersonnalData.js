import SchemaModel from "../SchemaModel";


export class UserPersonnalData extends SchemaModel {
  static schema = {
    id: [SchemaModel.toString, '', SchemaModel.isNumeric],
    sex: [SchemaModel.toString, 'm', value => !!['m', 'f'].find(value.toLowerCase())],
    avs_number: [SchemaModel.toString, '', SchemaModel.isAVSNumber],
    employee_number: [SchemaModel.toString, ''],
    nationality: [SchemaModel.toString, ''],
    birthday: [SchemaModel.toString, ''],
    canton_residency: [SchemaModel.toString, ''],
    residency_type: [SchemaModel.toInteger, 0, SchemaModel.isInteger],
    language: [SchemaModel.toString, 'fr', value => !!['fr', 'de', 'it', 'en'].find(value.toLowerCase())],
  }
}
