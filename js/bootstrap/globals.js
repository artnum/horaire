import admin from '../admin.js'
import KLogin from '../lib/login.js'
import { kafetch, kafetch2 } from '../fetch.js'
import KAPI from '../lib/kapi.js'
import Missing from '../ui/missing.js'
import KAButton from '../ui/ka-button.js'
import KAEntryForm from '../ui/ka-entry-form.js'
import KAPlanningUI from '../ui/ka-planning.js'
import KCarInteractUI from '../ui/car-interact.js'
import MsgInteractUI from '../ui/msg-interact.js'
import UIUtils from '../ui/utils.js'
import KAList from '../ui/list.js'
import { STProcess, STProject, STPerson, STCategory } from '../stores.js'
import UIKABXFactureList from '../ui/ka-bxfacture-list.js'
import UIKABXProjectList from '../ui/ka-bxproject-list.js'
import KACarAdminUI from '../ui/ka-car-admin.js'
import UIKAContactForm from '../ui/ka-contact-form.js'
import UIKAContact from '../ui/ka-contact.js'
import UIKAContactOld from '../ui/ka-contact-old.js'
import UIKAGroupForm from '../ui/ka-group-form.js'
import KAErrorUI from '../ui/ka-error.js'
import KAFieldsetUI from '../ui/ka-fieldset.js'
import UIKAProjectForm from '../ui/ka-project-form.js'
import KED from '../ked.js'
import KAProject from '../data/project.js'
import KAGroup from '../data/group.js'
import KATemps from '../data/temps.js'
import { DataUtils, $s, $i } from '../data/utils.js'
import Kolor from '../lib/color.js'
import { isIntEmpty, isIdEmpty, isStringEmpty, isFloatEmpty, arrayFirstNonEmptyString } from '../lib/empty.js'
import KAFloat from '../lib/float.js'
import getTVA from '../lib/tva.js'
import QRBill from '../lib/qrbill.js'
import KABxBill from '../lib/bxbill.js'
import checkBuildNumberAndReload from '../lib/revision.js'
import Item from '../item.js'
import KGanttView from '../gantt.js'
import { BXROGenericStore } from '../store/bx-rogeneric.js'
import { BXCountryStore } from '../store/bx-country.js'
import { BXUserStore } from '../store/bx-user.js'
import { GroupStore } from '../store/group.js'

import '../kaal.js'
import '../string.js'
import { installColorThemeSync } from '../lib/color-theme.js'

// Legacy admin/*.html modules and the app shell share the color theme preference.
installColorThemeSync()

window.Admin = admin
window.KLogin = KLogin
window.kafetch = kafetch
window.kafetch2 = kafetch2
window.KAPI = KAPI
window.Missing = Missing
window.KAButton = KAButton
window.KAEntryForm = KAEntryForm
window.KAPlanningUI = KAPlanningUI
window.KCarInteractUI = KCarInteractUI
window.MsgInteractUI = MsgInteractUI
window.UIUtils = UIUtils
window.KAList = KAList
window.STProcess = STProcess
window.STProject = STProject
window.STPerson = STPerson
window.STCategory = STCategory
window.UIKABXFactureList = UIKABXFactureList
window.UIKABXProjectList = UIKABXProjectList
window.KACarAdminUI = KACarAdminUI
window.UIKAContactForm = UIKAContactForm
window.UIKAContact = UIKAContact
window.UIKAContactOld = UIKAContactOld
window.UIKAGroupForm = UIKAGroupForm
window.KAErrorUI = KAErrorUI
window.KAFieldsetUI = KAFieldsetUI
window.UIKAProjectForm = UIKAProjectForm
window.KED = KED
window.KAProject = KAProject
window.KAGroup = KAGroup
window.KATemps = KATemps
window.DataUtils = DataUtils
window.$s = $s
window.$i = $i
window.Kolor = Kolor
window.isIntEmpty = isIntEmpty
window.isIdEmpty = isIdEmpty
window.isStringEmpty = isStringEmpty
window.isFloatEmpty = isFloatEmpty
window.arrayFirstNonEmptyString = arrayFirstNonEmptyString
window.KAFloat = KAFloat
window.getTVA = getTVA
window.QRBill = QRBill
window.KABxBill = KABxBill
window.checkBuildNumberAndReload = checkBuildNumberAndReload
window.Item = Item
window.KGanttView = KGanttView
// Bexio / store helpers used as bare globals by legacy admin UI modules
window.BXROGenericStore = BXROGenericStore
window.BXCountryStore = BXCountryStore
window.BXUserStore = BXUserStore
window.GroupStore = GroupStore

export {
  admin, KLogin, kafetch, kafetch2, KAPI, Missing, KAButton,
  STProcess, STProject, STPerson, STCategory, DataUtils,
  BXROGenericStore, BXCountryStore, BXUserStore, GroupStore,
}