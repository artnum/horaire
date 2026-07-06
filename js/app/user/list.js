import { UserAPI as UserAPIClass } from '../../JAPI/content/User.js';
import format from '../../lib/format.js'
import l10n from '../../lib/l10n.js'
import RouterHandler from '../router.js'

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