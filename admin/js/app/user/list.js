import { UserAPI as UserAPIClass } from './$script/src/JAPI/content/User';
import format from './$script/src/lib/format.js'
import l10n from './$script/src/lib/l10n.js'
import RouterHandler from './$script/admin/app/router.js'

const UserAPI = UserAPIClass.getInstance()

export default class List {
    constructor()
    {
        this.container = document.createElement('DIV')
        this.container.classList.add('ka-list', 'ka-user-list')
        this.init()
    }

    init ()
    {

    }
}