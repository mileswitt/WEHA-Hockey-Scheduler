// ─── Install: npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
// ─── Place at: src/components/LeagueCalendar.jsx

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

// ─── All Teams ────────────────────────────────────────────────────
const TEAMS = [
  // WCHL 10U A
  { teamName: "WCHL Steamboat 10U A",                  league: "WCHL", division: "10U A", wins: 19, ties: 0 },
  { teamName: "WCHL Aspen Leafs 10U A",                league: "WCHL", division: "10U A", wins: 17, ties: 1 },
  { teamName: "WCHL Summit 10U A",                     league: "WCHL", division: "10U A", wins: 12, ties: 2 },
  { teamName: "WCHL WEHA WOLVERINES 10U A",            league: "WCHL", division: "10U A", wins: 8,  ties: 4 },
  { teamName: "WCHL Vail Mountaineers 10U A White",    league: "WCHL", division: "10U A", wins: 8,  ties: 1 },
  { teamName: "WCHL Vail Mountaineers 10U A Blue",     league: "WCHL", division: "10U A", wins: 7,  ties: 1 },
  { teamName: "WCHL Grand Junction River Hawks 10U A", league: "WCHL", division: "10U A", wins: 3,  ties: 3 },
  { teamName: "WCHL Telluride 10U A",                  league: "WCHL", division: "10U A", wins: 2,  ties: 1 },
  { teamName: "WCHL Glenwood 10U A",                   league: "WCHL", division: "10U A", wins: 0,  ties: 1 },
  // WCHL 10U B
  { teamName: "WCHL Steamboat 10U B",                  league: "WCHL", division: "10U B", wins: 16, ties: 2 },
  { teamName: "WCHL Aspen Leafs 10U B",                league: "WCHL", division: "10U B", wins: 16, ties: 1 },
  { teamName: "WCHL Vail Mountaineers 10U B Blue",     league: "WCHL", division: "10U B", wins: 14, ties: 3 },
  { teamName: "WCHL Glenwood 10U B",                   league: "WCHL", division: "10U B", wins: 14, ties: 0 },
  { teamName: "WCHL Vail Mountaineers 10U B White",    league: "WCHL", division: "10U B", wins: 11, ties: 1 },
  { teamName: "WCHL Summit 10U B White",               league: "WCHL", division: "10U B", wins: 5,  ties: 4 },
  { teamName: "WCHL Summit 10U B Blue",                league: "WCHL", division: "10U B", wins: 5,  ties: 3 },
  { teamName: "WCHL WEHA WOLVERINES 10U B",            league: "WCHL", division: "10U B", wins: 4,  ties: 2 },
  { teamName: "WCHL Telluride 10U B",                  league: "WCHL", division: "10U B", wins: 4,  ties: 1 },
  { teamName: "WCHL Grand Junction River Hawks 10U B", league: "WCHL", division: "10U B", wins: 0,  ties: 1 },
  // WCHL 12U A
  { teamName: "WCHL Telluride 12U A",                  league: "WCHL", division: "12U A", wins: 20, ties: 2 },
  { teamName: "WCHL Steamboat 12U A",                  league: "WCHL", division: "12U A", wins: 18, ties: 3 },
  { teamName: "WCHL Aspen Leafs 12U A",                league: "WCHL", division: "12U A", wins: 13, ties: 1 },
  { teamName: "WCHL Summit 12U A",                     league: "WCHL", division: "12U A", wins: 10, ties: 1 },
  { teamName: "WCHL Vail Mountaineers 12U A White",    league: "WCHL", division: "12U A", wins: 9,  ties: 2 },
  { teamName: "WCHL Vail Mountaineers 12U A Blue",     league: "WCHL", division: "12U A", wins: 6,  ties: 0 },
  { teamName: "WCHL Grand Junction River Hawks 12U A", league: "WCHL", division: "12U A", wins: 4,  ties: 1 },
  { teamName: "WCHL WEHA WOLVERINES 12U A",            league: "WCHL", division: "12U A", wins: 2,  ties: 0 },
  // WCHL 12U B
  { teamName: "WCHL Vail Mountaineers 12U B Blue",     league: "WCHL", division: "12U B", wins: 20, ties: 0 },
  { teamName: "WCHL Vail Mountaineers 12U B White",    league: "WCHL", division: "12U B", wins: 18, ties: 1 },
  { teamName: "WCHL Aspen Leafs 12U B",                league: "WCHL", division: "12U B", wins: 13, ties: 2 },
  { teamName: "WCHL Steamboat 12U B",                  league: "WCHL", division: "12U B", wins: 12, ties: 1 },
  { teamName: "WCHL Summit 12U B",                     league: "WCHL", division: "12U B", wins: 10, ties: 0 },
  { teamName: "WCHL Telluride 12U B",                  league: "WCHL", division: "12U B", wins: 5,  ties: 2 },
  { teamName: "WCHL WEHA WOLVERINES 12U B",            league: "WCHL", division: "12U B", wins: 4,  ties: 1 },
  { teamName: "WCHL Grand Junction River Hawks 12U B", league: "WCHL", division: "12U B", wins: 1,  ties: 3 },
  // WCHL 14U A
  { teamName: "WCHL Aspen Leafs 14U A",                league: "WCHL", division: "14U A", wins: 22, ties: 0 },
  { teamName: "WCHL Summit 14U A",                     league: "WCHL", division: "14U A", wins: 18, ties: 1 },
  { teamName: "WCHL Vail Mountaineers 14U A",          league: "WCHL", division: "14U A", wins: 14, ties: 2 },
  { teamName: "WCHL Steamboat 14U A",                  league: "WCHL", division: "14U A", wins: 5,  ties: 2 },
  { teamName: "WCHL Grand Junction River Hawks 14U A", league: "WCHL", division: "14U A", wins: 5,  ties: 1 },
  { teamName: "WCHL WEHA WOLVERINES 14U A",            league: "WCHL", division: "14U A", wins: 4,  ties: 2 },
  // WCHL 14U B
  { teamName: "WCHL Aspen Leafs 14U B",                league: "WCHL", division: "14U B", wins: 18, ties: 4 },
  { teamName: "WCHL Vail Mountaineers 14U B Blue",     league: "WCHL", division: "14U B", wins: 15, ties: 3 },
  { teamName: "WCHL Telluride 14U B",                  league: "WCHL", division: "14U B", wins: 14, ties: 3 },
  { teamName: "WCHL Summit 14U B",                     league: "WCHL", division: "14U B", wins: 13, ties: 1 },
  { teamName: "WCHL Glenwood 14U B",                   league: "WCHL", division: "14U B", wins: 7,  ties: 1 },
  { teamName: "WCHL Vail Mountaineers 14U B White",    league: "WCHL", division: "14U B", wins: 5,  ties: 2 },
  { teamName: "WCHL Grand Junction River Hawks 14U B", league: "WCHL", division: "14U B", wins: 0,  ties: 0 },
  // CCYHL
  { teamName: "CCYHL Durango 10U A",  league: "CCYHL", division: "10U A", wins: 1, ties: 0 },
  { teamName: "CCYHL Durango 10U B",  league: "CCYHL", division: "10U B", wins: 0, ties: 0 },
  { teamName: "CCYHL Durango 12U A",  league: "CCYHL", division: "12U A", wins: 3, ties: 0 },
  { teamName: "CCYHL Durango 12U B",  league: "CCYHL", division: "12U B", wins: 0, ties: 0 },
  { teamName: "CCYHL Durango 14U A",  league: "CCYHL", division: "14U A", wins: 0, ties: 0 },
  { teamName: "CCYHL Durango 14U B",  league: "CCYHL", division: "14U B", wins: 0, ties: 0 },
  { teamName: "CCYHL Fraser 12U B",   league: "CCYHL", division: "12U B", wins: 2, ties: 0 },
  // Independent
  { teamName: "TT Durango 12U A",                 league: "Independent", division: "12U A",        wins: 0, ties: 0 },
  { teamName: "RMHF Littleton Hawks 10U A White", league: "Independent", division: "10U A",        wins: 2, ties: 0 },
  { teamName: "Boulder Pee Wee A",                league: "Independent", division: "Independent",  wins: 0, ties: 1 },
  { teamName: "Krivo Pee Wee A",                  league: "Independent", division: "Independent",  wins: 0, ties: 0 },
];

// ─── All 841 Players (from player.csv) ───────────────────────────
const PLAYERS_RAW = [
  ["THEO","BROOKS","2420464","WCHL Telluride 12U A"],
  ["CLAYTON","FOLK","2419489","WCHL Summit 10U B Blue"],
  ["MATTHEW","DIFIORE","2420465","WCHL Telluride 12U A"],
  ["ACEN","ROLNICK","2420298","WCHL Aspen Leafs 10U A"],
  ["RYDER","ROBINSON","2268417","WCHL Steamboat 12U A"],
  ["NATHAN","FRY","2419495","WCHL Aspen Leafs 14U A"],
  ["DAVID","POPEK","2246617","WCHL Summit 10U A"],
  ["BENJAMIN","TAYLOR","2419490","WCHL Aspen Leafs 14U A"],
  ["MILES","GRAYSON","2374640","WCHL Vail Mountaineers 12U B White"],
  ["NASH","COGSWELL","2420485","WCHL Vail Mountaineers 12U B Blue"],
  ["BRIDGER","BENSON","2595238","WCHL Summit 14U A"],
  ["TYLER","SCHMITT","2420294","WCHL Aspen Leafs 10U A"],
  ["CHRISTOPHER","SAUNDERS","2420456","WCHL Telluride 12U A"],
  ["GAVIN","KINGHORN","2366193","WCHL Steamboat 10U A"],
  ["PARKER","FINDLAY-HOUGHTON","2366178","WCHL Steamboat 12U B"],
  ["GAVIN","VOLD","2419525","WCHL Aspen Leafs 14U B"],
  ["GABE","GUSAAS","2246638","WCHL Summit 12U A"],
  ["LOGAN","CHARTIER","2491478","WCHL Glenwood 14U B"],
  ["BANNER","MAROTT","2419499","WCHL Vail Mountaineers 14U B Blue"],
  ["DYLAN","SAUNDERS","2420575","WCHL Telluride 14U B"],
  ["JOHN BRIGGS","WELDEN","2419521","WCHL Aspen Leafs 14U A"],
  ["GRADY","BLOUNT","2420470","WCHL Telluride 12U A"],
  ["MAGNUS","CARLSON","2419492","WCHL Aspen Leafs 14U A"],
  ["ZACHARY","LAUERMAN","2419296","WCHL WEHA WOLVERINES 10U A"],
  ["LUCA","RIZZUTO","2539213","WCHL Aspen Leafs 14U A"],
  ["WALKER","CONNOLLY","2420492","WCHL Vail Mountaineers 12U B Blue"],
  ["KADE","GABRIEL","2582900","WCHL Glenwood 10U A"],
  ["CAMERON","LIGHT","2419522","WCHL Aspen Leafs 14U B"],
  ["NASH","CARTER","2419438","WCHL Aspen Leafs 12U B"],
  ["FORS","JOHNSON","2420303","WCHL Glenwood 10U A"],
  ["ASHER","ERHOLTZ","2366182","WCHL Steamboat 10U A"],
  ["WYATT","LAWRENCE","2419439","WCHL Aspen Leafs 12U A"],
  ["MADDOX","MILLER","2419435","WCHL Aspen Leafs 12U A"],
  ["TANNER","BARBIN","2419517","WCHL Aspen Leafs 14U A"],
  ["ZACHARY","BOECKERS","2537039","WCHL Summit 14U B"],
  ["VITO","CIPRIANI","2246627","WCHL Summit 10U A"],
  ["KELLER","FRANKO","2268399","WCHL Steamboat 14U A"],
  ["FISHER","GIBSON","2268400","WCHL Steamboat 14U A"],
  ["BECKETT","GREER","2374652","WCHL Vail Mountaineers 12U B White"],
  ["HOUSTON","TAYLOR","2366188","WCHL Steamboat 10U A"],
  ["HENRY","WALSH","2268420","WCHL Steamboat 12U A"],
  ["CALVIN","CHOPKO","2366213","WCHL Vail Mountaineers 10U B White"],
  ["JACKSON","COX","2374646","WCHL Vail Mountaineers 12U B White"],
  ["COLTON","FOLK","2419437","WCHL Aspen Leafs 12U A"],
  ["CHARLES","HERRERA","2366216","WCHL Vail Mountaineers 10U B White"],
  ["CHRISTIAN","LOPEZ","2366210","WCHL Steamboat 10U B"],
  ["IRVIN","OSSOLA","2420460","WCHL Telluride 12U A"],
  ["MASON","BELMONT","2366172","WCHL Steamboat 12U B"],
  ["ZEB","BURGER","2582904","WCHL Glenwood 10U A"],
  ["SAIGE","DENTON","2335653","WCHL Vail Mountaineers 10U B Blue"],
  ["JACKSON","MOORE","2419361","WCHL WEHA WOLVERINES 12U A"],
  ["GAGE","SCAHILL","2315521","WCHL Vail Mountaineers 14U B White"],
  ["HESTIN","WRIGHT","2420487","WCHL Vail Mountaineers 12U B Blue"],
  ["TRAVIS","BEARD","2419484","WCHL Aspen Leafs 14U A"],
  ["LUCA","BIANCHI","2374649","WCHL Vail Mountaineers 12U B White"],
  ["WYATT","DEVITO","2420357","WCHL Aspen Leafs 10U B"],
  ["HONZA","KLIMA","2420494","WCHL Vail Mountaineers 12U B Blue"],
  ["SPENCER","MARCIN","2419508","WCHL Vail Mountaineers 14U B Blue"],
  ["BRIGGS","ROZINSKI","2246652","WCHL Summit 14U A"],
  ["CODY","SHEPHERD","2419379","WCHL Aspen Leafs 12U A"],
  ["ASHER","STEIN","2246653","WCHL Summit 14U A"],
  ["CHASE","VINCENT","2419384","WCHL Aspen Leafs 12U A"],
  ["TOMAS","COLLINS","2419293","WCHL WEHA WOLVERINES 10U A"],
  ["BRENNAN","KOENIG","2419501","WCHL Vail Mountaineers 14U B Blue"],
  ["DAVID","MORA BERNAT","2366190","WCHL Steamboat 10U A"],
  ["SAMUEL","MORGAN","2420354","WCHL Aspen Leafs 10U B"],
  ["ZACHARY","SMITH","2419381","WCHL Aspen Leafs 12U A"],
  ["BENJAMIN","SPAZIANI","2420488","WCHL Vail Mountaineers 12U B Blue"],
  ["JAKUB","TOPOR","2419506","WCHL Vail Mountaineers 14U B Blue"],
  ["BODEN","VERHEUL","2419378","WCHL Aspen Leafs 12U A"],
  ["MAYSON","ADAIR","2246635","WCHL Summit 12U A"],
  ["SAMUEL","BIEBUYCK","2419300","WCHL WEHA WOLVERINES 10U A"],
  ["KAI","GRUETER","2419518","WCHL Aspen Leafs 14U B"],
  ["NATHANIEL","KUBEK","2246649","WCHL Summit 14U A"],
  ["LIAM","SCHLICHTING","2420495","WCHL Vail Mountaineers 12U A White"],
  ["WALKER","SORENSEN","2246639","WCHL Summit 12U A"],
  ["TYLER","BOYD","2420489","WCHL Vail Mountaineers 12U B White"],
  ["JACK","CLIFFORD","2419485","WCHL Aspen Leafs 14U A"],
  ["RYDER","GERBER","2335663","WCHL Vail Mountaineers 10U B Blue"],
  ["COLTON","JONES","2419524","WCHL Aspen Leafs 14U A"],
  ["REES","LEARY","2366207","WCHL Steamboat 10U B"],
  ["OSCAR","MURRAY","2493648","WCHL Glenwood 14U B"],
  ["TIEGAN","STIEBEL","2419500","WCHL Vail Mountaineers 14U B Blue"],
  ["RYDER","MALIK","2420358","WCHL Aspen Leafs 10U B"],
  ["HAYDEN","POE","2262171","WCHL Grand Junction River Hawks 14U A"],
  ["KAI","RIEGLER","2366183","WCHL Steamboat 10U A"],
  ["RYLAN","FIELDS","2419377","WCHL Aspen Leafs 12U A"],
  ["DEEKIN","MEYER","2300680","WCHL Grand Junction River Hawks 12U A"],
  ["MACY","POWERS","2246650","WCHL Summit 14U A"],
  ["XANDER","ROLNICK","2420290","WCHL Aspen Leafs 10U A"],
  ["ETHAN","SHUPP","2420570","WCHL Telluride 14U B"],
  ["TATE","ARAGON","2366202","WCHL Steamboat 10U B"],
  ["MILES","DACE","2420310","WCHL Glenwood 10U A"],
  ["ANNALIESE","INGRAM","2419526","WCHL Aspen Leafs 14U B"],
  ["JOHN","LEWIN III","2420285","WCHL Aspen Leafs 10U A"],
  ["WESTON","PEPLINSKI","2315528","WCHL Vail Mountaineers 14U B White"],
  ["DAVID","PETKOV","2374648","WCHL Vail Mountaineers 12U B White"],
  ["ERIN","WALSH","2246630","WCHL Summit 12U A"],
  ["BEAU","BRAWNER","2419292","WCHL WEHA WOLVERINES 10U A"],
  ["NATE","FOLSOM","2732170","WCHL Grand Junction River Hawks 12U A"],
  ["AUGUST","FUNKE","2419297","WCHL WEHA WOLVERINES 10U A"],
  ["DYLAN","GARVEY","2315571","WCHL Vail Mountaineers 10U A White"],
  ["ETHAN","GUSAAS","2246648","WCHL Summit 14U A"],
  ["FELIX","HURT","2268385","WCHL Grand Junction River Hawks 14U B"],
  ["WESTON","JACOBER","2419494","WCHL Aspen Leafs 14U A"],
  ["CHARLES","JAY","2538396","WCHL Aspen Leafs 10U A"],
  ["GRADY","MCGALLIARD","2420537","WCHL Vail Mountaineers 14U A"],
  ["CARSON","MIKETIN","2483234","WCHL Glenwood 14U B"],
  ["TUCKER","MURRAY","2582892","WCHL Glenwood 10U A"],
  ["THOMAS","WERNER","2315531","WCHL Vail Mountaineers 14U B White"],
  ["JAKE","BASTIEN","2366259","WCHL Vail Mountaineers 12U A White"],
  ["ROCCO","GARAFFA","2419527","WCHL Aspen Leafs 14U B"],
  ["MARCO","GENNETT","2420542","WCHL Vail Mountaineers 14U A"],
  ["ISAIAS","GUTIERREZ VIDAL","2420565","WCHL Telluride 14U B"],
  ["ERIC","LAIDLAW","2420540","WCHL Vail Mountaineers 14U A"],
  ["AARON","MERRIMAN","2374650","WCHL Vail Mountaineers 12U B White"],
  ["RORY","SMITH","2582893","WCHL Glenwood 10U A"],
  ["HAYDEN","WASS","2246620","WCHL Summit 10U A"],
  ["MALCOLM","BERG","2419516","WCHL Aspen Leafs 14U B"],
  ["PORTER","BLACK","2420563","WCHL Telluride 14U B"],
  ["LOREN","BRADSHAW","2374651","WCHL Vail Mountaineers 12U B White"],
  ["DESMOND","BRENNER","2246629","WCHL Summit 10U A"],
  ["BRODY","JACOBER","2419386","WCHL Aspen Leafs 12U A"],
  ["FINLAY","KOENIG","2374643","WCHL Vail Mountaineers 12U B White"],
  ["SAMUEL","LANDA","2315581","WCHL Vail Mountaineers 10U A White"],
  ["TEAGAN","LAVIN","2419376","WCHL Aspen Leafs 12U A"],
  ["JUSTIN","LEE","2262173","WCHL Grand Junction River Hawks 14U A"],
  ["TAJ","SIMON","2420459","WCHL Telluride 12U A"],
  ["NOAH","ARNHOLD","2315527","WCHL Vail Mountaineers 14U B White"],
  ["BROOKS","BENT","2542551","WCHL Vail Mountaineers 14U A"],
  ["LANDIS","BREITZMAN","2315523","WCHL Vail Mountaineers 14U B White"],
  ["ANDREW","CLEMMONS","2268425","WCHL Steamboat 12U A"],
  ["SAGE","FIELDS","2419488","WCHL Aspen Leafs 14U A"],
  ["BEAU","FLEMING","2268418","WCHL Steamboat 12U A"],
  ["CHARLY","LANDA","2419504","WCHL Vail Mountaineers 14U B Blue"],
  ["DAX","MACOMBER","2315545","WCHL Vail Mountaineers 10U A Blue"],
  ["OLIVER","NYLEN","2268415","WCHL Steamboat 12U A"],
  ["DAWSON","SMITH","2420486","WCHL Vail Mountaineers 12U B White"],
  ["ROY","TALBERT","2419457","WCHL WEHA WOLVERINES 14U A"],
  ["CASH","WALKER","2419502","WCHL Vail Mountaineers 14U B Blue"],
  ["DYLAN","WEINREICH","2315567","WCHL Vail Mountaineers 10U A White"],
  ["FLETCHER","CAHALANE","2537037","WCHL Summit 14U B"],
  ["JADEN","CASWELL","2419511","WCHL Summit 14U A"],
  ["LOUIE","DEVITO","2246644","WCHL Summit 14U A"],
  ["JAXON","FIELDS","2419328","WCHL Summit 10U B Blue"],
  ["THATCHER","HINDE","2420344","WCHL Telluride 10U A"],
  ["RIVER","KLUG","2420287","WCHL Aspen Leafs 10U A"],
  ["MASON","MCFARLAND","2246637","WCHL Summit 12U A"],
  ["HENRY","MELLENTHIN","2419486","WCHL Aspen Leafs 14U A"],
  ["COBIN","OCONNOR","2419456","WCHL WEHA WOLVERINES 14U A"],
  ["OWEN","OLSON","2366257","WCHL Vail Mountaineers 12U A White"],
  ["CALDER","PARRISH","2374647","WCHL Vail Mountaineers 12U B White"],
  ["ETAI","PLATT","2419520","WCHL Aspen Leafs 14U B"],
  ["KAYNE","REDDEN","2419363","WCHL WEHA WOLVERINES 12U A"],
  ["BROOKS","ROBINSON","2420484","WCHL Vail Mountaineers 12U B White"],
  ["LUKAS","ZELEZNY","2419503","WCHL Vail Mountaineers 14U B Blue"],
  ["DYLAN","BANKERT","2315570","WCHL Vail Mountaineers 10U A White"],
  ["CHRISTOPHER","DUNN","2542552","WCHL Vail Mountaineers 14U A"],
  ["CLAY","ELICKER","2374644","WCHL Vail Mountaineers 12U B White"],
  ["ANTONIO","GLERIA","2420455","WCHL Telluride 12U A"],
  ["CALVIN","GLOOR","2420291","WCHL Aspen Leafs 10U A"],
  ["WILLIAM","HAGIST","2420289","WCHL Aspen Leafs 10U A"],
  ["COLE","HAWLEY","2419464","WCHL WEHA WOLVERINES 14U A"],
  ["ASHER","LAMOTTA","2335668","WCHL Vail Mountaineers 10U B Blue"],
  ["BODHI","LOWE","2419326","WCHL Summit 10U B Blue"],
  ["GAGE","MARTIN","2483243","WCHL Glenwood 14U B"],
  ["KEEGAN","OKELLY","2366263","WCHL Vail Mountaineers 12U A White"],
  ["HOYT","RICHTER","2300686","WCHL Grand Junction River Hawks 12U A"],
  ["LUCIANO","SANTAMBROGIO","2366253","WCHL Vail Mountaineers 12U A White"],
  ["ZANDER","SANTE","2420571","WCHL Telluride 14U B"],
  ["WES","BASTIEN","2315549","WCHL Vail Mountaineers 10U A Blue"],
  ["COLIN","BRESNAHAN","2246628","WCHL Summit 10U A"],
  ["BRODY","CORRIGAN","2366252","WCHL Vail Mountaineers 12U A White"],
  ["JACKSON","DERAS","2593259","WCHL Aspen Leafs 12U B"],
  ["HENRY","DOEBLER","2420293","WCHL Aspen Leafs 10U A"],
  ["KAYO","EHLERS","2420304","WCHL Telluride 10U A"],
  ["JUAN","FILIPELLO-BARNA","2419385","WCHL Aspen Leafs 12U A"],
  ["ANDREW","FOLEY","2366209","WCHL Steamboat 10U B"],
  ["CARTER","GLASSER","2315542","WCHL Vail Mountaineers 10U A Blue"],
  ["GRIP","GOLDSTEIN","2268421","WCHL Steamboat 12U A"],
  ["MCFADIN","HOLLOWAY","2483242","WCHL Aspen Leafs 12U B"],
  ["TYLER","LEPORE","2366260","WCHL Vail Mountaineers 12U A White"],
  ["ETHAN","MAINIER","2420463","WCHL Telluride 12U A"],
  ["MAKENZIE","SCHMITT","2420299","WCHL Aspen Leafs 10U A"],
  ["WILLIAM","SOMMERS","2420567","WCHL Telluride 14U B"],
  ["EASTON","STANLEY","2419374","WCHL WEHA WOLVERINES 12U A"],
  ["BENJAMIN","TATER","2246654","WCHL Summit 14U A"],
  ["LINDSEY","WADEY","2419498","WCHL Vail Mountaineers 14U B Blue"],
  ["KEENAN","WARREN","2300678","WCHL Grand Junction River Hawks 12U A"],
  ["BRENNAN","BERDOULAY","2315544","WCHL Vail Mountaineers 10U A Blue"],
  ["LUCA","CIPRIANI","2246640","WCHL Summit 12U A"],
  ["COOPER","COWLES","2420539","WCHL Vail Mountaineers 14U A"],
  ["LEO","FERTIG","2420316","WCHL Telluride 10U A"],
  ["CAMDEN","KANN","2366225","WCHL Vail Mountaineers 10U B White"],
  ["KANE","MARINEZ","2366203","WCHL Steamboat 10U B"],
  ["LARS","MONROE","2420541","WCHL Vail Mountaineers 14U A"],
  ["HENRY","NYLEN","2366181","WCHL Steamboat 10U A"],
  ["OLIVER","PATTEN","2366192","WCHL Steamboat 10U A"],
  ["ROBERTO","VEGA","2419505","WCHL Vail Mountaineers 14U B Blue"],
  ["JAYDEN","WIONO","2419514","WCHL Summit 14U B"],
  ["JACOBY","BUTLER","2336080","WCHL Grand Junction River Hawks 10U A"],
  ["JOHN","CHAMPOUX","2419425","WCHL Summit 12U B"],
  ["BRENDAN","CROFTON","2420544","WCHL Vail Mountaineers 14U A"],
  ["AUGUST","FEENEY","2483237","WCHL Glenwood 14U B"],
  ["NICHOLAS","KISIELICA","2420534","WCHL Vail Mountaineers 14U A"],
  ["COLE","MIRE","2420493","WCHL Vail Mountaineers 12U B Blue"],
  ["TREVOR","PALMQUIST","2246643","WCHL Summit 14U A"],
  ["JACK","SHINGLES","2246656","WCHL Summit 14U A"],
  ["RYDER","BOORD","2315541","WCHL Vail Mountaineers 10U A Blue"],
  ["THOMAS","CHAMBERLAIN","2268422","WCHL Steamboat 12U A"],
  ["GUS","COLE","2335655","WCHL Vail Mountaineers 10U B Blue"],
  ["CAVEN","GRADY","2420312","WCHL Telluride 10U A"],
  ["JANSEN","GREEN","2300687","WCHL Grand Junction River Hawks 10U A"],
  ["WESLEY","HOFFMAN","2366173","WCHL Steamboat 12U B"],
  ["PAULUS","JONATHANS","2366198","WCHL Steamboat 10U B"],
  ["NICKLAS","LARSON","2246641","WCHL Summit 12U A"],
  ["DANIEL","LITVIAKOU","2366261","WCHL Vail Mountaineers 12U A White"],
  ["KLIMEK","LOWISZ","2582905","WCHL Glenwood 10U A"],
  ["BODE","MACKEY","2246626","WCHL Summit 10U A"],
  ["OLIVER","MARCUS","2420363","WCHL Aspen Leafs 10U B"],
  ["COLIN","MASON","2366199","WCHL Steamboat 10U B"],
  ["DAVID","MICHALSKI","2419424","WCHL Summit 12U B"],
  ["FOFOLYDIA RAIN","MILE","2582899","WCHL Glenwood 10U A"],
  ["EMMA","OLSON","2335656","WCHL Vail Mountaineers 10U B Blue"],
  ["OLIN","PETERSEN","2419426","WCHL Summit 12U B"],
  ["LUKE","PFAUTZ","2419382","WCHL Aspen Leafs 12U A"],
  ["ZACH","SUAZO","2419372","WCHL WEHA WOLVERINES 12U A"],
  ["GAVIN","VOLD","2539214","WCHL Aspen Leafs 14U A"],
  ["SKOGEN","WACHTER","2420536","WCHL Vail Mountaineers 14U A"],
  ["EMMALINE","WINGARD","2268419","WCHL Steamboat 12U A"],
  ["TOMMY","ZANE","2604504","WCHL Aspen Leafs 14U B"],
  ["HYLAND","ANDERSON","2246632","WCHL Summit 12U A"],
  ["ZAYDEN","COLLINS","2246624","WCHL Summit 10U A"],
  ["MATTHEW","DOZIER","2374641","WCHL Vail Mountaineers 12U B White"],
  ["DYLAN","EVES","2420483","WCHL Vail Mountaineers 12U B Blue"],
  ["AMMON","FRANCONE","2366165","WCHL Steamboat 12U B"],
  ["JULIUS","GREEN","2611305","WCHL Grand Junction River Hawks 12U A"],
  ["EMMETT","HARE","2419313","WCHL WEHA WOLVERINES 10U A"],
  ["BROOKS","HEINEMANN","2315532","WCHL Vail Mountaineers 14U B White"],
  ["NEWELL","HOFFNER","2268409","WCHL Steamboat 14U A"],
  ["BENJAMIN","LAUERMAN","2419295","WCHL WEHA WOLVERINES 10U A"],
  ["MERRIC","LUTZ-SLADDIN","2420297","WCHL Aspen Leafs 10U A"],
  ["KEEGAN","MCPARLAND-DAAB","2419523","WCHL Aspen Leafs 14U B"],
  ["JACY","MILLER","2374645","WCHL Vail Mountaineers 12U B White"],
  ["TIERNAN","MULROY","2315524","WCHL Vail Mountaineers 14U B White"],
  ["RYDER","NOAKES","2315529","WCHL Vail Mountaineers 14U B White"],
  ["FLOYD","SEDUNOV","2419461","WCHL WEHA WOLVERINES 14U A"],
  ["PERI","SILBERMAN","2366255","WCHL Vail Mountaineers 12U A White"],
  ["CORMAC","SMITH","2335667","WCHL Vail Mountaineers 10U B Blue"],
  ["TY","VASZILY","2268404","WCHL Steamboat 14U A"],
  ["JACK","VIDAMOUR","2419448","WCHL Aspen Leafs 12U B"],
  ["BARRETT","ZENOR","2335664","WCHL Vail Mountaineers 10U B Blue"],
  ["OLIN","ZYGULSKI","2246646","WCHL Summit 14U A"],
  ["KINGSLY","BARR","2420295","WCHL Aspen Leafs 10U A"],
  ["STANLEY","BIRRITTELLA","2420454","WCHL Telluride 12U A"],
  ["NICO","BOWDRE","2268398","WCHL Steamboat 14U A"],
  ["CODY","BRICKELL","2483238","WCHL Glenwood 14U B"],
  ["ANDREW","COOK","2419371","WCHL WEHA WOLVERINES 12U A"],
  ["BENJAMIN","DAHL","2491481","WCHL Glenwood 14U B"],
  ["MESA","DICKERSON","2262176","WCHL Grand Junction River Hawks 14U A"],
  ["CONNOR","GRAY","2366186","WCHL Steamboat 10U A"],
  ["HATTIE","HIATT","2420414","WCHL Vail Mountaineers 12U A White"],
  ["CASH","HILGEFORD","2997868","WCHL Glenwood 14U B"],
  ["KASH","KEDROWSKI","2315522","WCHL Vail Mountaineers 14U B White"],
  ["FISCHER","KOPASZ","2366197","WCHL Steamboat 10U B"],
  ["MAXWELL","LANDA","2420415","WCHL Vail Mountaineers 12U A Blue"],
  ["SAMUEL","MITCHELL","2366208","WCHL Steamboat 10U B"],
  ["RYDER","POPPE","2419401","WCHL WEHA WOLVERINES 12U B"],
  ["CHASE","SAKATA","2246655","WCHL Summit 14U A"],
  ["MARTIN","WADDICK","2246622","WCHL Summit 10U A"],
  ["THOMAS","ZANE","2419491","WCHL Aspen Leafs 14U A"],
  ["MILAN","ANZULEWICZ","2366171","WCHL Steamboat 12U B"],
  ["OLIVER","BARCZA","2335660","WCHL Vail Mountaineers 10U B Blue"],
  ["GRIFF","BARRETT","2300685","WCHL Grand Junction River Hawks 12U A"],
  ["GREYSON","BICKERT","2420220","TT Durango 12U A"],
  ["ALEXANDER","BOYD","2315546","WCHL Vail Mountaineers 10U A Blue"],
  ["OWEN","BRADLEY","2246642","WCHL Summit 12U A"],
  ["LIAM","CLARKE","2336013","WCHL Grand Junction River Hawks 10U B"],
  ["LODEN","COWLES","2315543","WCHL Vail Mountaineers 10U A Blue"],
  ["EMMETT","DAVIES","2419335","WCHL Summit 10U B Blue"],
  ["JAMES","DECOURSEY","2336085","WCHL Grand Junction River Hawks 10U A"],
  ["JOEL","DORMAIER","2262177","WCHL Grand Junction River Hawks 14U A"],
  ["TURNER","DOW","2366211","WCHL Vail Mountaineers 10U B White"],
  ["LUKAS","ECHELMEIER","2419431","WCHL Summit 12U B"],
  ["SLADE","EHLERS","2420466","WCHL Telluride 12U A"],
  ["WILLIAM","ELLIOTT","2315548","WCHL Vail Mountaineers 10U A Blue"],
  ["LIAM","FITZGERALD","2366221","WCHL Vail Mountaineers 10U B White"],
  ["COLIN","FOGARTY","2336079","WCHL Grand Junction River Hawks 10U A"],
  ["MASON","FORTIER","2420362","WCHL Aspen Leafs 10U B"],
  ["CHASE","FOSHA","2537047","WCHL Summit 14U B"],
  ["HENRY","HALEY","2419497","WCHL Vail Mountaineers 14U B Blue"],
  ["JAYDEN","HARGIS","2268411","WCHL Steamboat 14U A"],
  ["LOGAN","JOHNSTON","2825332","RMHF Littleton Hawks 10U A White"],
  ["AUSTIN","RIGGINS","2366223","WCHL Vail Mountaineers 10U B White"],
  ["RANGER","SEGUIN","2419447","WCHL Aspen Leafs 12U B"],
  ["HENRY","STEPAN","2366191","WCHL Steamboat 10U A"],
  ["KAI","UMMEL","2366174","WCHL Steamboat 12U B"],
  ["JANE","WALDORF","2537038","WCHL Summit 14U B"],
  ["REID","ALBERS","2366264","WCHL Vail Mountaineers 12U A White"],
  ["JACOB","BARBER","2420349","WCHL Telluride 10U B"],
  ["CLAY","BELBY","2246621","WCHL Summit 10U A"],
  ["VIOLET","BIRDSONG","2300683","WCHL Grand Junction River Hawks 12U A"],
  ["DAXTON","BURBANK","2419294","WCHL WEHA WOLVERINES 10U A"],
  ["ASHER","DANIELS","2495376","CCYHL Durango 10U A"],
  ["KENDALL","GLANCEY","2877101","WCHL Summit 14U B"],
  ["PATE","HOLLOWAY","2593260","WCHL Aspen Leafs 12U B"],
  ["JAY","HOLTON","2420411","WCHL Vail Mountaineers 12U A Blue"],
  ["CHARLIE","JAY","2760540","WCHL Aspen Leafs 10U A"],
  ["HENRY","LARIMER","2419427","WCHL Summit 12U B"],
  ["LEIGHTON","LAVIN","2582898","WCHL Glenwood 10U A"],
  ["DAVID","PAGE","2366254","WCHL Vail Mountaineers 12U A White"],
  ["SAMUEL","PARRISH","2420509","WCHL Grand Junction River Hawks 12U B"],
  ["NICHOLAS","PAZIN","2246631","WCHL Summit 12U A"],
  ["JOHANN","RAMIREZ","2420574","WCHL Telluride 14U B"],
  ["RIDGE","REBOUL","2582896","WCHL Glenwood 10U A"],
  ["MASON","REGAN","2268401","WCHL Steamboat 14U A"],
  ["BEN","SCHAPPERT","2246618","WCHL Summit 10U A"],
  ["DYLAN","SIBL","2611323","WCHL Grand Junction River Hawks 12U A"],
  ["GIOVANNI","SMITH","2420467","WCHL Telluride 12U A"],
  ["HUDSON","STURTEVANT","2419432","WCHL Summit 12U B"],
  ["CALVIN","SWANSON","2315530","WCHL Vail Mountaineers 14U B White"],
  ["DYLAN","THOMES","2419362","WCHL WEHA WOLVERINES 12U A"],
  ["BRAEDEN","TOMPKINS","2262178","WCHL Grand Junction River Hawks 14U A"],
  ["WYATT","TUCKER","2420469","WCHL Telluride 12U A"],
  ["JOHNNY","VELLA","2460888","CCYHL Fraser 12U B"],
  ["COLBY","WARK","2419462","WCHL WEHA WOLVERINES 14U A"],
  ["TYLER","WOOD","2420221","TT Durango 12U A"],
  ["VAUGHN","ANDERSON","2335661","WCHL Vail Mountaineers 10U B Blue"],
  ["BRIAN","BAER","2419373","WCHL WEHA WOLVERINES 12U A"],
  ["CALEB","BAKER","2877103","WCHL Summit 14U B"],
  ["SADIE","BERMAN","2366169","WCHL Steamboat 12U B"],
  ["RIO","BIRK","2335652","WCHL Vail Mountaineers 10U B Blue"],
  ["JOSEPH","CARTER","2419333","WCHL Summit 10U B Blue"],
  ["HENRY","CRUMP","2268402","WCHL Steamboat 14U A"],
  ["TUCKER","DILLON","2366224","WCHL Vail Mountaineers 10U B White"],
  ["GEORGE","EATON","2419315","WCHL WEHA WOLVERINES 10U B"],
  ["PHINEAS","FORD","2419324","WCHL Summit 10U B Blue"],
  ["THOR","GLEASMAN","2419443","WCHL Aspen Leafs 12U B"],
  ["SEBASTIAN","GOMEZ","2419366","WCHL WEHA WOLVERINES 12U A"],
  ["ZACHARY","GREGORY","2335662","WCHL Vail Mountaineers 10U B Blue"],
  ["SAM","HANSEN","2419446","WCHL Aspen Leafs 12U B"],
  ["CASH","HILGEFORD","3004385","WCHL Glenwood 14U B"],
  ["KUPER","KOSTUR","2336077","WCHL Grand Junction River Hawks 10U A"],
  ["RONAN","LACY","2366185","WCHL Steamboat 10U A"],
  ["DAMIAN","LEISTER","2366200","WCHL Steamboat 10U B"],
  ["DRAKE","LOUGHMAN","2420218","TT Durango 12U A"],
  ["EZRA","LOWE","2246625","WCHL Summit 10U A"],
  ["TRISTAN","MARLOW","2366206","WCHL Steamboat 10U B"],
  ["GAVIN","MURPHY","2419331","WCHL Summit 10U B Blue"],
  ["ANDREW","POOLE","2420284","WCHL Aspen Leafs 10U A"],
  ["MADDEN","PURDY","2760998","WCHL Summit 14U B"],
  ["CAYDEN","RAWSON","2246651","WCHL Summit 14U A"],
  ["HARRISON","RIPPY","2582906","WCHL Glenwood 10U A"],
  ["LEVI","ROLLINS","2600871","WCHL Grand Junction River Hawks 14U B"],
  ["COLTER","RYAN","2420286","WCHL Aspen Leafs 10U A"],
  ["BRYSON","SAVAGEAU","2300693","WCHL Grand Junction River Hawks 12U B"],
  ["PRESTON","SHAHAN","2300692","WCHL Grand Junction River Hawks 12U B"],
  ["TRISTAN","SHANKLAND","2335657","WCHL Vail Mountaineers 10U B Blue"],
  ["MAXTON","SHAVER","2419394","WCHL WEHA WOLVERINES 12U A"],
  ["SHAI","SILBERMAN","2420535","WCHL Vail Mountaineers 14U A"],
  ["MALACHI","TILTON","2262174","WCHL Grand Junction River Hawks 14U A"],
  ["KATHLEEN","VIELE","2366262","WCHL Vail Mountaineers 12U A White"],
  ["RYDER","WEAVER","2300684","WCHL Grand Junction River Hawks 12U A"],
  ["JACK","WILLETT","2419364","WCHL WEHA WOLVERINES 12U A"],
  ["JONAH","ZOBS","2419465","WCHL WEHA WOLVERINES 14U A"],
  ["LUCA","BARCLAY","2366184","WCHL Steamboat 10U A"],
  ["BRIDGER","BARRETT","2420573","WCHL Telluride 14U B"],
  ["KAIDEN","BARTELLI","2419450","WCHL WEHA WOLVERINES 14U A"],
  ["WYATT","BIELAK","2419370","WCHL WEHA WOLVERINES 12U A"],
  ["CADE","BRUEGGEMEIER","2419512","WCHL Summit 14U B"],
  ["LUKE","CAMPANALE","2420543","WCHL Vail Mountaineers 14U B Blue"],
  ["THOMAS","CAREY","2300681","WCHL Grand Junction River Hawks 12U A"],
  ["LEONARDO","CHRISTENSEN","2366201","WCHL Steamboat 10U B"],
  ["ANTHONY","CORREIA","2366218","WCHL Vail Mountaineers 10U B White"],
  ["CHANGE","CURREY","2246619","WCHL Summit 10U A"],
  ["OWEN","DEGARMO","2460887","CCYHL Fraser 12U B"],
  ["JACKSON","DERAS","2595909","WCHL Aspen Leafs 12U B"],
  ["CAMILLE","DOEBLER","2420292","WCHL Aspen Leafs 10U A"],
  ["CANNON","DOTY","2420418","WCHL Vail Mountaineers 12U A White"],
  ["BODHI","ETTERS","2420410","WCHL Vail Mountaineers 12U A White"],
  ["STANLEY","FOWLER","2268414","WCHL Steamboat 12U A"],
  ["HARPER","FRENCH","2419380","WCHL Aspen Leafs 12U A"],
  ["ROCCO","GARAFFA","2539215","WCHL Aspen Leafs 14U A"],
  ["MARK","GOULD","2595932","WCHL Glenwood 10U A"],
  ["WALKER","GREEN","2420262","CCYHL Durango 12U A"],
  ["JASE","HANSEN","2419332","WCHL Summit 10U B Blue"],
  ["RYDER","HANSEN","2420356","WCHL Aspen Leafs 10U B"],
  ["HUNTER","HECK","2582903","WCHL Glenwood 10U A"],
  ["KADEN","KEDROWSKI","2366212","WCHL Vail Mountaineers 10U B White"],
  ["CODY","KINTZ","2419400","WCHL WEHA WOLVERINES 12U A"],
  ["KNOX","MADSON","2460894","CCYHL Fraser 12U B"],
  ["BECKETT","MCKNIGHT","2825333","RMHF Littleton Hawks 10U A White"],
  ["BENJAMIN","MOAK","2582902","WCHL Glenwood 10U A"],
  ["ARLO","MURRELL","2419334","WCHL Summit 10U B Blue"],
  ["LIAM","NEYERS","2336084","WCHL Grand Junction River Hawks 10U A"],
  ["JACKSON","OLDRIGHT","2300679","WCHL Grand Junction River Hawks 12U A"],
  ["CHARLIE","REAMER","2419455","WCHL WEHA WOLVERINES 14U A"],
  ["ELI","REDDING","3150924","WCHL Summit 14U B"],
  ["EASTON","RIDENOUR","2315526","WCHL Vail Mountaineers 14U B White"],
  ["SAWYER","ROMAN","2315536","WCHL Vail Mountaineers 10U A Blue"],
  ["ARLO","SCHMIDT","2336078","WCHL Grand Junction River Hawks 10U A"],
  ["RYE","SMITH","2420307","WCHL Telluride 10U A"],
  ["JOSEPH","SOTO","2420508","WCHL Telluride 12U B"],
  ["OSAGE","SYLVESTER","3009286","WCHL Grand Junction River Hawks 14U A"],
  ["HARPER","VERDECCHIA","2419391","WCHL WEHA WOLVERINES 12U A"],
  ["BRENNAN","WADDELL","2420248","CCYHL Durango 10U A"],
  ["WYATT","WATTS","2420533","WCHL Vail Mountaineers 14U B Blue"],
  ["KNOX","WHITE","3008314","WCHL Grand Junction River Hawks 10U B"],
  ["BRADY","WRIGHT","2420267","CCYHL Durango 12U A"],
  ["COOPER","ZIMMERMANN","2420468","WCHL Telluride 12U A"],
  ["SKYLAR","ANDERSON","2763286","WCHL Summit 10U B Blue"],
  ["BRODY","BEAUCHAMP","2483244","WCHL Glenwood 14U B"],
  ["GRIFFIN","BEST","2420238","CCYHL Durango 10U A"],
  ["COSTNER","BRADSHAW","2420421","WCHL Vail Mountaineers 12U A Blue"],
  ["WILLIAM","BRIESCH","2825342","RMHF Littleton Hawks 10U A White"],
  ["JACKSON","BUSSMANN","2825341","RMHF Littleton Hawks 10U A White"],
  ["JOHN","CAPSAY","2420219","TT Durango 12U A"],
  ["MOUTIMA","CARROLL","2419299","WCHL WEHA WOLVERINES 10U A"],
  ["LACHLAN","CHEN","2420361","WCHL Aspen Leafs 10U B"],
  ["RYDER","CONDON","2420318","WCHL Telluride 10U A"],
  ["COOPER","CONNOLLY","2246623","WCHL Summit 10U A"],
  ["SAM","CORNISH","2419375","WCHL Aspen Leafs 12U A"],
  ["MARCELLO","COSTABILE","2366215","WCHL Vail Mountaineers 10U B White"],
  ["WILLIAM","DIAZ","2262179","WCHL Grand Junction River Hawks 14U A"],
  ["CADEN","DONALDSON","2336081","WCHL Grand Junction River Hawks 10U A"],
  ["SEBASTION","EKSTORM","3150672","Krivo Pee Wee A"],
  ["LACHLAN","FRASER","2315580","WCHL Vail Mountaineers 10U A White"],
  ["COLTEN","FURNACE","2471519","WCHL Grand Junction River Hawks 12U B"],
  ["GABI","GARAFFA","2794980","WCHL Aspen Leafs 14U B"],
  ["JONATHAN","GORBOLD","2315547","WCHL Vail Mountaineers 10U A Blue"],
  ["EZRA","HALLADAY","2268403","WCHL Steamboat 14U A"],
  ["GUNNAR","HATZENBUEHLER","2611291","WCHL Grand Junction River Hawks 14U B"],
  ["BENJAMIN","HENION","2268406","WCHL Steamboat 14U A"],
  ["DALTON","HUFF","2825329","RMHF Littleton Hawks 10U A White"],
  ["KAYDEN","JACOBS","2420347","WCHL Telluride 10U B"],
  ["MADDOX","KALEIKINI-SANDERS","2366179","WCHL Steamboat 12U B"],
  ["BROOKLYN","KENNEDY LEWIS","2419440","WCHL Aspen Leafs 12U A"],
  ["LIAM","KIRBY","2541815","WCHL Aspen Leafs 14U B"],
  ["AIDEN","LAMOTTA","2335654","WCHL Vail Mountaineers 10U B Blue"],
  ["MADELYN","LEMON","2419429","WCHL Summit 12U B"],
  ["HAYES","MCKNIGHT","2420305","WCHL Telluride 10U A"],
  ["JAMES","MUSGROVE","2366176","WCHL Steamboat 12U B"],
  ["GRAYSON","OLDRIGHT","2336017","WCHL Grand Junction River Hawks 10U B"],
  ["LOGAN","OLSON","2595931","WCHL Glenwood 10U A"],
  ["ANDRE","PETIK","2262180","WCHL Grand Junction River Hawks 14U A"],
  ["EVER","PURDY","2460884","CCYHL Fraser 12U B"],
  ["KNOX","RASMUSSEN","2419303","WCHL WEHA WOLVERINES 10U A"],
  ["ALEX","SCANLAN","2335665","WCHL Vail Mountaineers 10U B Blue"],
  ["TAYOLR","SORENSEN","2760499","WCHL Summit 10U B Blue"],
  ["NASH","SUCICH","2315569","WCHL Vail Mountaineers 10U A White"],
  ["DYLAN","TALADAY","2419329","WCHL Summit 10U B Blue"],
  ["HEATH","TALBERT","2419398","WCHL WEHA WOLVERINES 12U B"],
  ["SAWYER","TOFIG","2419428","WCHL Summit 12U B"],
  ["RYKER","VALENTI","2246636","WCHL Summit 12U B"],
  ["CHASE","VASZILY","2366187","WCHL Steamboat 10U A"],
  ["OWEN","WAGNER","2419513","WCHL Summit 14U B"],
  ["ANDREW","WEINMAN","2268407","WCHL Steamboat 14U A"],
  ["CANYON","WEIS","2315538","WCHL Vail Mountaineers 10U A Blue"],
  ["THOMAS","AMEND","2420319","WCHL Telluride 10U A"],
  ["BODHI","BACALIS","2419399","WCHL WEHA WOLVERINES 12U A"],
  ["FINN","BECK","2420306","WCHL Telluride 10U A"],
  ["ATTICUS","BERG","2420359","WCHL Aspen Leafs 10U B"],
  ["BRADY","BINIECKI","2315539","WCHL Vail Mountaineers 10U A Blue"],
  ["BENNETT","BOCCELLA","2420317","WCHL Glenwood 10U A"],
  ["COOPER","BOWDRE","2366166","WCHL Steamboat 12U B"],
  ["BRYCE","BROADRICK","2419323","WCHL Summit 10U B Blue"],
  ["COLT","BROWN","2366214","WCHL Vail Mountaineers 10U B White"],
  ["MALIAH","CALLIES","2794036","WCHL Glenwood 14U B"],
  ["SOFIA","CARLSON","2419442","WCHL Aspen Leafs 12U B"],
  ["NASH","CARTER","2591197","WCHL Aspen Leafs 12U A"],
  ["TERESA","CERNY","2419422","WCHL Summit 12U B"],
  ["JOHN TEDDY","CHAMNESS","2366220","WCHL Vail Mountaineers 10U B White"],
  ["CARISSA","COLEMAN","2419392","WCHL WEHA WOLVERINES 12U B"],
  ["GEORGE","CONNOLLY","2246634","WCHL Summit 12U A"],
  ["TATUM","COWAN","2763288","WCHL Summit 10U B Blue"],
  ["MASON","CRIST","2419451","WCHL WEHA WOLVERINES 14U A"],
  ["GEORGE","CROSS","2315579","WCHL Vail Mountaineers 10U A White"],
  ["MAZZY","DACE","2420510","WCHL Telluride 12U B"],
  ["BRAXTON","DAVIES","2419327","WCHL Summit 10U B Blue"],
  ["DEXTER","DELMONICO","2366204","WCHL Steamboat 10U B"],
  ["KOBE","DEPAGTER KUSUNO","2420564","WCHL Telluride 14U B"],
  ["MYAH","DESSERICH","2647665","WCHL Grand Junction River Hawks 14U B"],
  ["JAYDIN","DIAZ","2336088","WCHL Grand Junction River Hawks 10U A"],
  ["LIAM","DOWEN","2336014","WCHL Grand Junction River Hawks 10U B"],
  ["KNOX","FREEMAN","2825344","RMHF Littleton Hawks 10U A White"],
  ["CLAIRE","GLOVER","2419311","WCHL WEHA WOLVERINES 10U B"],
  ["JACOB","GRAVITY","2420245","CCYHL Durango 10U A"],
  ["BECK","HAAZ","2651930","WCHL WEHA WOLVERINES 12U B"],
  ["JACE","HAND","3101470","WCHL Telluride 10U A"],
  ["JOHNATHAN","HASENBALG","2268424","WCHL Steamboat 12U A"],
  ["BECKWITH","HASZ","2419360","WCHL WEHA WOLVERINES 12U A"],
  ["CONNER","HEIN","2419397","WCHL WEHA WOLVERINES 12U B"],
  ["BROOKS","HEINEMANN","2535305","WCHL Vail Mountaineers 14U A"],
  ["BLAKE","HENNIG","2825330","RMHF Littleton Hawks 10U A White"],
  ["JOHN","HUDGINS","2420420","WCHL Vail Mountaineers 12U A Blue"],
  ["KINDLE","KRONER","2419423","WCHL Summit 12U B"],
  ["MILES","KULPA","2460880","CCYHL Fraser 12U B"],
  ["LINCOLN","LAGACE","2419330","WCHL Summit 10U B Blue"],
  ["RUBY","LAKE","2420566","WCHL Telluride 14U B"],
  ["CHARLES","LYNCH","2420461","WCHL Telluride 12U A"],
  ["TAYTON","MANGAN","2420240","CCYHL Durango 10U A"],
  ["HARRY","MANNO","2420457","WCHL Telluride 12U A"],
  ["JACOB","MARTINEZ","2419388","WCHL WEHA WOLVERINES 12U B"],
  ["CODY","MARTZ","2420419","WCHL Vail Mountaineers 12U A Blue"],
  ["JULES","MATHER","2315525","WCHL Vail Mountaineers 14U B White"],
  ["HARLAN","MAY","2420296","WCHL Aspen Leafs 10U A"],
  ["HAMISH","MILLER","2420512","WCHL Telluride 12U B"],
  ["IVAN","MILLER","2336015","WCHL Grand Junction River Hawks 10U B"],
  ["WOODSON","OBRIEN","2420572","WCHL Telluride 14U B"],
  ["ERIK","PETERS","2420413","WCHL Vail Mountaineers 12U A Blue"],
  ["CASH","POMMIER","2420264","CCYHL Durango 12U A"],
  ["MADDEN","PURDY","2651172","WCHL Summit 14U B"],
  ["BLUE","REICHLEY","2366167","WCHL Steamboat 12U B"],
  ["NOLAN","RESEIGH","2315572","WCHL Vail Mountaineers 10U A White"],
  ["ELI","RIVERS","2582901","WCHL Glenwood 10U A"],
  ["LUCA","RIZZUTO","2419519","WCHL Aspen Leafs 14U B"],
  ["TYLER","SIBL","2268383","WCHL Grand Junction River Hawks 14U B"],
  ["GAVING","STEWART","2420360","WCHL Aspen Leafs 10U B"],
  ["HENRY","STONE","2645424","WCHL Grand Junction River Hawks 12U B"],
  ["WALKER","TEMPLIN","2420511","WCHL Telluride 12U B"],
  ["LEVI","TOWNSEND","2419302","WCHL WEHA WOLVERINES 10U B"],
  ["SOREN","VAN WINKLE","2420268","CCYHL Durango 12U A"],
  ["KIRBY","VERDECCHIA","2419310","WCHL WEHA WOLVERINES 10U B"],
  ["BEAU","WACKER","2366219","WCHL Vail Mountaineers 10U B White"],
  ["CASH","WALKER","2535304","WCHL Vail Mountaineers 14U A"],
  ["HALEY","WALSH","2655150","WCHL Summit 14U A"],
  ["WYATT","WATTS","2998512","WCHL Vail Mountaineers 14U A"],
  ["LENSKY","WESTVEER","2420471","WCHL Telluride 12U A"],
  ["DOMINICK","YOST","2335666","WCHL Vail Mountaineers 10U B Blue"],
  ["ASHER","AFRICANO","3150680","Krivo Pee Wee A"],
  ["BENJAMIN","ANTHONY","2419309","WCHL WEHA WOLVERINES 10U A"],
  ["VOJTECH","BACHLEDA","3255926","Boulder Pee Wee A"],
  ["HUNTER","BAKER","2262175","WCHL Grand Junction River Hawks 14U A"],
  ["EMMA","BANGERT","2647664","WCHL Grand Junction River Hawks 14U B"],
  ["JAKE","BARBER","2596132","WCHL Glenwood 10U A"],
  ["REMINGTON","BARRETT","2420351","WCHL Telluride 10U B"],
  ["GARRETT","BELLIS","2460882","CCYHL Fraser 12U B"],
  ["DRYSTAN","BLACKWELL","2611270","WCHL Grand Junction River Hawks 14U B"],
  ["DEREK","BLOEMENDAAL","3255903","Boulder Pee Wee A"],
  ["MASON","BOGGS","2336087","WCHL Grand Junction River Hawks 10U A"],
  ["ERICH","BORMANN","2336020","WCHL Grand Junction River Hawks 10U B"],
  ["CARSON","BROGUS","3150673","Krivo Pee Wee A"],
  ["LOTTIE","BUTCHER","2419298","WCHL WEHA WOLVERINES 10U A"],
  ["LEONARD","CALIOGLU","2335659","WCHL Vail Mountaineers 10U B Blue"],
  ["JULIA","CARLSON","2420315","WCHL Telluride 10U A"],
  ["PORTER","CARR","2420243","CCYHL Durango 10U A"],
  ["DEKLYN","CITO","2825340","RMHF Littleton Hawks 10U A White"],
  ["JALIE","COLBY","2300689","WCHL Grand Junction River Hawks 12U B"],
  ["ZADEN","COLLINS","2593973","WCHL Summit 10U B Blue"],
  ["JACK","COMTE","2760821","WCHL Telluride 10U B"],
  ["LILIANA","DICKINSON","2268386","WCHL Grand Junction River Hawks 14U B"],
  ["ENDER","DORAN","3255917","Boulder Pee Wee A"],
  ["LANDON","ENDSLEY","2262172","WCHL Grand Junction River Hawks 14U A"],
  ["NATHANIEL","FOLSOM","3097649","WCHL Grand Junction River Hawks 12U A"],
  ["ARTHUR","FORSYTHE","2420314","WCHL Glenwood 10U A"],
  ["LIAM","FRASER","2420417","WCHL Vail Mountaineers 12U A Blue"],
  ["JACOB","FREY","2419453","WCHL WEHA WOLVERINES 14U A"],
  ["GABI","GARAFFA","2794978","WCHL Aspen Leafs 14U B"],
  ["WYATT","GERDR","2366189","WCHL Steamboat 10U A"],
  ["JANSEN","GREEN","2645438","WCHL Grand Junction River Hawks 12U B"],
  ["TEAGAN","HALEY","3150674","Krivo Pee Wee A"],
  ["BRANDON","HALLOCK","2419368","WCHL WEHA WOLVERINES 12U A"],
  ["BENNETT","HAMILTON","2246616","WCHL Summit 10U B Blue"],
  ["WILL","HANLON","2366258","WCHL Vail Mountaineers 12U A White"],
  ["BRYER","HELVEY","2419318","WCHL WEHA WOLVERINES 10U B"],
  ["ETHAN","IKAUNIKS","2420342","WCHL Telluride 10U B"],
  ["JAKOB","JAMES","2366170","WCHL Steamboat 12U B"],
  ["RIVER","JOHNSON","2300691","WCHL Grand Junction River Hawks 12U B"],
  ["WYATT","JOHNSON","3009322","WCHL Grand Junction River Hawks 10U B"],
  ["HARRISON","KAPP","2420239","CCYHL Durango 10U A"],
  ["SKYLA","KENNEDY","2794977","WCHL Aspen Leafs 14U B"],
  ["HUDSON","KIRKMAN","2315577","WCHL Vail Mountaineers 10U A White"],
  ["KOLE","KOCH","2419510","WCHL Summit 14U B"],
  ["ANYA","KRAJNIKOVIC","2246633","WCHL Summit 12U A"],
  ["BRUCE","LAFOE","2419463","WCHL WEHA WOLVERINES 14U A"],
  ["PAYTON","LAMB","2268384","WCHL Grand Junction River Hawks 14U B"],
  ["BEN","LAUERMAN","2761216","WCHL WEHA WOLVERINES 10U B"],
  ["KELLER","LINDBERG","2420458","WCHL Telluride 12U A"],
  ["CAMPBELL","LINSTER","2825338","RMHF Littleton Hawks 10U A White"],
  ["WILL","LOFTUS","2760750","WCHL WEHA WOLVERINES 12U B"],
  ["JOSEPH","LOTZ","2366177","WCHL Steamboat 12U B"],
  ["STEPHEN","MAGNER","2315568","WCHL Vail Mountaineers 10U A White"],
  ["ALEXANDER","MALTBY","2419367","WCHL WEHA WOLVERINES 12U A"],
  ["CARSON","MESSNER","2419369","WCHL WEHA WOLVERINES 12U A"],
  ["BRIDGER","MEYER","2419317","WCHL WEHA WOLVERINES 10U B"],
  ["HAYDEN","MITCHELL","2336021","WCHL Grand Junction River Hawks 10U B"],
  ["KEAGAN","MONTGOMERY","2268410","WCHL Steamboat 14U A"],
  ["MASON","NICHOLS","2419454","WCHL WEHA WOLVERINES 14U A"],
  ["CALE","OWEN","2582897","WCHL Glenwood 10U A"],
  ["BLAKE","PACKARD","2268408","WCHL Steamboat 14U A"],
  ["OWEN","PARHAM","2420416","WCHL Vail Mountaineers 12U A White"],
  ["NEVO","PLATT","2419436","WCHL Aspen Leafs 12U B"],
  ["DYLAN","RACINE","2420507","WCHL Telluride 12U B"],
  ["SUMMER","RATHBONE","2336011","WCHL Grand Junction River Hawks 10U B"],
  ["JACK","REDMOND","2315535","WCHL Vail Mountaineers 10U A Blue"],
  ["JACKSON","RIGGINS","2315537","WCHL Vail Mountaineers 10U A Blue"],
  ["CALEB","ROSSON","2336016","WCHL Grand Junction River Hawks 10U B"],
  ["LIAM","SCHAAF","2336022","WCHL Grand Junction River Hawks 10U B"],
  ["DRAYDEN","SEWARD","2419306","WCHL WEHA WOLVERINES 10U A"],
  ["MAXTON","SHAVER","2732011","WCHL WEHA WOLVERINES 12U A"],
  ["HENRY","SIEVING","2420513","WCHL Telluride 12U B"],
  ["JOSEPH","SILVESTRI","3255927","Boulder Pee Wee A"],
  ["GREYSON","SIZELOVE","2300697","WCHL Grand Junction River Hawks 12U B"],
  ["EVEN","SOLOMON","3255922","Boulder Pee Wee A"],
  ["EVAN","STAIGHT","2366222","WCHL Vail Mountaineers 10U B White"],
  ["EMMAJEAN","STANLEY-KAICHEN","2419312","WCHL WEHA WOLVERINES 10U B"],
  ["LUCA","SYLVESTER","2611327","WCHL Grand Junction River Hawks 12U A"],
  ["WILLIAM","TEAGUE","2420490","WCHL Vail Mountaineers 12U B Blue"],
  ["ATLEY","TILLGER","2419389","WCHL WEHA WOLVERINES 12U A"],
  ["ATLEY","TILLGER","2732012","WCHL WEHA WOLVERINES 12U A"],
  ["BRANTLEY","TOWNSEND","2419393","WCHL WEHA WOLVERINES 12U B"],
  ["QUINTON","TREVINO","2600873","WCHL Grand Junction River Hawks 14U B"],
  ["LYDIA","VALENTI","2763287","WCHL Summit 10U B Blue"],
  ["ELLIS","WARNKE","2268427","WCHL Steamboat 12U A"],
  ["HOLLY","WARREN","2419316","WCHL WEHA WOLVERINES 10U A"],
  ["COLT","WILLIAMS","2336018","WCHL Grand Junction River Hawks 10U B"],
  ["ZANE","WORRELL","2336082","WCHL Grand Junction River Hawks 10U A"],
  ["JAXON","YU","2419325","WCHL Summit 10U B White"],
  ["POLLARD","ADDIS","2420277","CCYHL Durango 14U B"],
  ["KINLEY","ALDRIDGE","2336019","WCHL Grand Junction River Hawks 10U B"],
  ["CHASE","ALLEN","2420258","CCYHL Durango 10U B"],
  ["JAMES","AMEND","2760822","WCHL Telluride 10U B"],
  ["KEAGAN","ANDOW-REES","3044407","WCHL Glenwood 14U B"],
  ["BRAYDEN","ANTONSON","2420272","CCYHL Durango 12U B"],
  ["BODHI","BACALIS","2732720","WCHL WEHA WOLVERINES 12U B"],
  ["VOJTECH","BALCHLEDA","3255911","Boulder Pee Wee A"],
  ["VIVIAN","BARRETT","2734606","WCHL Telluride 12U B"],
  ["JACK","BARROW","2420251","CCYHL Durango 10U B"],
  ["OLIVIA","BELFOURE","3150669","Krivo Pee Wee A"],
  ["JACOBS","BEN","3150677","Krivo Pee Wee A"],
  ["LAUREN","BEST","2420269","CCYHL Durango 12U B"],
  ["DRYSTEN","BLACKWELL","2600872","WCHL Grand Junction River Hawks 14U B"],
  ["BEN","BLANCHARD","2481606","CCYHL Durango 14U B"],
  ["STEVEN","BLEVINS","2420276","CCYHL Durango 12U B"],
  ["DEREK","BLOEMENDAAL","3255918","Boulder Pee Wee A"],
  ["SABINA","BOALS","3255908","Boulder Pee Wee A"],
  ["SABINA","BOALS","3255923","Boulder Pee Wee A"],
  ["RIDGE","BOBO","2460891","CCYHL Fraser 12U B"],
  ["BENAIAH","BOKELMAN","2420252","CCYHL Durango 10U B"],
  ["GIDEON","BOKELMAN","2420282","CCYHL Durango 14U B"],
  ["YAEL","BOKELMAN","2420270","CCYHL Durango 12U B"],
  ["JACK","BROWNE","2420346","WCHL Telluride 10U B"],
  ["BECKETT","BUCHANAN","2315578","WCHL Vail Mountaineers 10U A White"],
  ["TEVYN","BULGIER","2420279","CCYHL Durango 14U B"],
  ["RYAN","BURKE","3044403","WCHL Glenwood 14U B"],
  ["PAISLEY","BURKETT","3150678","Krivo Pee Wee A"],
  ["IAN","BURNHAM","2268387","WCHL Grand Junction River Hawks 14U B"],
  ["THEODORE","CAPPELLUCCI","2419314","WCHL WEHA WOLVERINES 10U B"],
  ["ASHER","CARBALLO","2419305","WCHL WEHA WOLVERINES 10U A"],
  ["DOMINIC","CATON","2420247","CCYHL Durango 10U A"],
  ["CHIP","CATSMAN","2481596","CCYHL Durango 14U A"],
  ["ELIAS","CHUA","2537036","WCHL Summit 14U B"],
  ["ASHER","CLAIR","2420216","TT Durango 12U A"],
  ["CONRAD","CLEGG","2481600","CCYHL Durango 14U A"],
  ["ANDREW","CLEMMONS","3358623","WCHL Grand Junction River Hawks 12U A"],
  ["GANNON","COKER","2420256","CCYHL Durango 10U B"],
  ["MYRANDA JO","COLBY","2336010","WCHL Grand Junction River Hawks 10U B"],
  ["TATIANA","COLLINS","2419390","WCHL WEHA WOLVERINES 12U B"],
  ["ZAYDEN","COLLINS","2545206","WCHL Summit 10U B White"],
  ["JACK","COPE","3255904","Boulder Pee Wee A"],
  ["JACK","COPE","3255919","Boulder Pee Wee A"],
  ["ARDEN","CRAWFORD","3202835","WCHL Grand Junction River Hawks 10U B"],
  ["RYLAN","CROWE","3044386","WCHL Glenwood 14U B"],
  ["JADA","DACCUMA","2794037","WCHL Glenwood 14U B"],
  ["GUNNAR","DALEY-GOULD","2460886","CCYHL Fraser 12U B"],
  ["RYDER","DELLAMORA","2420255","CCYHL Durango 10U B"],
  ["MAXWELL","DELMONICO","2366175","WCHL Steamboat 12U B"],
  ["JOHN","DEMPSEY","2419452","WCHL WEHA WOLVERINES 14U A"],
  ["SAIGE","DENTON","3290397","WCHL Vail Mountaineers 10U B White"],
  ["JACKSON","DERAS","3008351","WCHL Grand Junction River Hawks 12U B"],
  ["DANTE","DEVITRE","2572905","CCYHL Durango 14U B"],
  ["HENRI","DEVITRE","2420213","TT Durango 12U A"],
  ["ELIJAH","DIDONATO","2471520","WCHL Grand Junction River Hawks 12U B"],
  ["ETHAN","DIDONATO","3009324","WCHL Grand Junction River Hawks 10U B"],
  ["WILL","DOHERTY","2420568","WCHL Telluride 14U B"],
  ["ENDER","DORAN","3255902","Boulder Pee Wee A"],
  ["AGATHA","DOS SANTOS","2420274","CCYHL Durango 12U B"],
  ["MARCO","DOVGANIK","3150676","Krivo Pee Wee A"],
  ["GEORGE","EATON","3101045","WCHL WEHA WOLVERINES 10U B"],
  ["INDIE","EATON","2481601","CCYHL Durango 14U B"],
  ["OWEN","ERWIN","2481598","CCYHL Durango 14U A"],
  ["WYATT","FEELEY","2460900","CCYHL Fraser 12U B"],
  ["WILLOW","FERRIS","2268388","WCHL Grand Junction River Hawks 14U B"],
  ["CASH","FERTIG","2420453","WCHL Telluride 12U A"],
  ["JUAN","FILIPELLO-BARNA","2595910","WCHL Aspen Leafs 12U B"],
  ["IAN","FOWLER","2572906","CCYHL Durango 14U B"],
  ["COLTEN","FURNACE","3358629","WCHL Grand Junction River Hawks 12U A"],
  ["COLTEN","GARINGER","2420223","TT Durango 12U A"],
  ["WYATT","GERDE","2494599","WCHL Steamboat 10U A"],
  ["WYATT","GERDE","3205199","WCHL Steamboat 10U A"],
  ["BRYSEN","GRANT","3044381","WCHL Glenwood 14U B"],
  ["COLTON","GREEN","2481602","CCYHL Durango 14U B"],
  ["JACKSON","GUGGISBERG","2366168","WCHL Steamboat 12U B"],
  ["JOSEPH","GUTIERREZ","2420215","TT Durango 12U A"],
  ["MADELEINE","HADRICK","2573231","CCYHL Durango 12U B"],
  ["HENRY","HALEY","3037247","WCHL Vail Mountaineers 14U B White"],
  ["MCKINLEY","HANSON","2420226","TT Durango 12U A"],
  ["TREY","HARVEY","2420311","WCHL Telluride 10U A"],
  ["GUNNAR","HATZENBUEHLER","2542276","WCHL Grand Junction River Hawks 14U B"],
  ["KELLEN","HERNANDEZ","2420263","CCYHL Durango 12U B"],
  ["BRECKLYN","HEUSCHAEL","2794035","WCHL Glenwood 14U B"],
  ["LUCAS","HILL","2420422","WCHL Vail Mountaineers 12U A Blue"],
  ["DYLAN","HIRSCH","2825337","RMHF Littleton Hawks 10U A White"],
  ["JUNE","HOUSLEY","2420222","TT Durango 12U A"],
  ["GRAHAM","HUBER","2460881","CCYHL Fraser 12U B"],
  ["LANDON","HUME","2993564","WCHL Grand Junction River Hawks 12U B"],
  ["HUGHES","HUNTER","3150681","Krivo Pee Wee A"],
  ["ELIJAH","IRELAND","2420253","CCYHL Durango 10U B"],
  ["WILDER","JAMES","2596131","WCHL Telluride 10U A"],
  ["WYLDER","JAMES","2420309","WCHL Telluride 10U A"],
  ["CRUZ","JANUARY","2315575","WCHL Vail Mountaineers 10U A White"],
  ["DAKOTA","JOHNSON","3150682","Krivo Pee Wee A"],
  ["CECILIA","KAPP","2420275","CCYHL Durango 12U B"],
  ["WESLEY","KARNES","2420250","CCYHL Durango 10U B"],
  ["SKYLA","KENNEDY","2794979","WCHL Aspen Leafs 14U B"],
  ["RORY","KIMBLE","2420308","WCHL Telluride 10U B"],
  ["DAVID","KLIMA","2315574","WCHL Vail Mountaineers 10U A White"],
  ["BRENNAN","KOENIG","3037211","WCHL Vail Mountaineers 14U B White"],
  ["AIDAN","KOSICK","2825331","RMHF Littleton Hawks 10U A White"],
  ["KUPER","KOSTUR","3059918","WCHL Grand Junction River Hawks 12U B"],
  ["FINLEY-JANE","KOZAK","2420313","WCHL Telluride 10U A"],
  ["GUNNAR","KRAUSE","2582894","WCHL Glenwood 10U A"],
  ["ANDREW","KUHLMAN","2419493","WCHL Aspen Leafs 14U A"],
  ["BIRKE","LAFOE","2419459","WCHL WEHA WOLVERINES 14U A"],
  ["AVERY","LARSON","2268389","WCHL Grand Junction River Hawks 14U B"],
  ["JAG","LARSON","2300695","WCHL Grand Junction River Hawks 12U B"],
  ["DMITRI","LAWRENCE","2420214","TT Durango 12U A"],
  ["WYATT","LAWRENCE","2762908","WCHL Aspen Leafs 12U A"],
  ["WYATT","LAWRENCE","3008382","WCHL Grand Junction River Hawks 12U B"],
  ["CARSON","LEEPER","2573232","CCYHL Durango 12U B"],
  ["COOPER","LINN","2481604","CCYHL Durango 14U A"],
  ["AIDAN","LOFTUS","2419396","WCHL WEHA WOLVERINES 12U B"],
  ["AIDAN","LOFTUS","2762141","WCHL WEHA WOLVERINES 12U B"],
  ["KAYLEY","LONG","3150671","Krivo Pee Wee A"],
  ["CARTER","LOPEZ","2420266","CCYHL Durango 12U A"],
  ["JERAD","LOPEZ","2481597","CCYHL Durango 14U B"],
  ["PRESTON","LOUGHMAN","2572908","CCYHL Durango 14U B"],
  ["EZRA","LOWE","2545207","WCHL Summit 10U B White"],
  ["BANNER","MAROTT","2535303","WCHL Vail Mountaineers 14U A"],
  ["MILO","MARTIN","2481603","CCYHL Durango 14U B"],
  ["BOBBY","MAYNES","3255910","Boulder Pee Wee A"],
  ["BOBBY","MAYNES","3255925","Boulder Pee Wee A"],
  ["DACE","MAZZY","2651928","WCHL Telluride 12U B"],
  ["KEAGAN","MCFARLAND","2542277","WCHL Glenwood 14U B"],
  ["DYLAN","MCGUAN","3203894","WCHL Summit 14U B"],
  ["RIVERS","MCKENZIE","2420224","TT Durango 12U A"],
  ["BRIDGER","MCNEIL","2460895","CCYHL Fraser 12U B"],
  ["BUD","MCWILLIAMS","2419460","WCHL WEHA WOLVERINES 14U A"],
  ["TRAVIS","MEININGER","2420237","CCYHL Durango 10U A"],
  ["NOAH","MENSING","2419304","WCHL WEHA WOLVERINES 10U A"],
  ["CALVIN","MESSNER","2419301","WCHL WEHA WOLVERINES 10U A"],
  ["MADDOX","MILLER","2762909","WCHL Aspen Leafs 12U A"],
  ["TEAGAN","MILLER","2420320","WCHL Glenwood 10U A"],
  ["WESTON","MOLANDER","3255900","Boulder Pee Wee A"],
  ["WESTON","MOLANDER","3255916","Boulder Pee Wee A"],
  ["SHEA","MORRISSEY","2481599","CCYHL Durango 14U B"],
  ["JACKSON","MORTON","2419387","WCHL Aspen Leafs 12U A"],
  ["BECKETT","MOSER","2315573","WCHL Vail Mountaineers 10U A White"],
  ["RUBEN","MULLEN","2572907","CCYHL Durango 14U B"],
  ["JACK","MUNN","2420271","CCYHL Durango 12U B"],
  ["NOAH","MURRAY","2420246","CCYHL Durango 10U A"],
  ["OSCAR","MURRAY","2543801","WCHL Aspen Leafs 14U B"],
  ["HENRY","NEINAS","3255905","Boulder Pee Wee A"],
  ["HENRY","NEINAS","3255920","Boulder Pee Wee A"],
  ["BOHDEN","NETTLES","2419395","WCHL WEHA WOLVERINES 12U B"],
  ["SEAN","NUGENT","2420227","TT Durango 12U A"],
  ["OLIVER","NYLEN","3358625","WCHL Grand Junction River Hawks 12U A"],
  ["THATCHER","OAKLAND","2366205","WCHL Steamboat 10U B"],
  ["JOSEPHINE","OBRIEN","2651929","WCHL Telluride 12U B"],
  ["COLBY","OLSON","2593261","WCHL Aspen Leafs 12U B"],
  ["EMMA","OLSON","3290399","WCHL Vail Mountaineers 10U B White"],
  ["LOGAN","OLSON","2582895","WCHL Glenwood 10U A"],
  ["AXEL","OROZCO","2825339","RMHF Littleton Hawks 10U A White"],
  ["SYLVESTER","OSAGE","2594401","WCHL Grand Junction River Hawks 14U A"],
  ["OLIVER","OWENS","2420241","CCYHL Durango 10U A"],
  ["WESTON","PEPLINSKI","3288691","WCHL Vail Mountaineers 14U A"],
  ["LUKE","PFAUTZ","2595908","WCHL Aspen Leafs 12U B"],
  ["GAVIN","PROCK","2300696","WCHL Grand Junction River Hawks 12U B"],
  ["KEILANI","PULLIAM","3174720","WCHL Glenwood 14U B"],
  ["LANDON","QUIMBY","2481605","CCYHL Durango 14U B"],
  ["ISAIAH","RATHBONE","2300690","WCHL Grand Junction River Hawks 12U B"],
  ["COLTEN","REBOUL","2582907","WCHL Glenwood 10U B"],
  ["KEELYN","REYNOLDS","2572910","CCYHL Durango 14U B"],
  ["BAYLN","RHONE","2460885","CCYHL Fraser 12U B"],
  ["BENJAMIN","RICE","2420281","CCYHL Durango 14U B"],
  ["CHARLES","ROBINSON","2335658","WCHL Vail Mountaineers 10U B Blue"],
  ["FOX","ROBINSON","2420345","WCHL Telluride 10U B"],
  ["LEVI","ROLLINS","3009285","WCHL Grand Junction River Hawks 14U B"],
  ["WESLEY","ROME","2420280","CCYHL Durango 14U B"],
  ["RIO","ROSE","2998800","WCHL Telluride 10U B"],
  ["BRYSON","SAVAGEAU","2993567","WCHL Grand Junction River Hawks 12U A"],
  ["BRYSON","SAVAGEAU","3358627","WCHL Grand Junction River Hawks 12U A"],
  ["RANGER","SEGUIN","2591196","WCHL Aspen Leafs 12U A"],
  ["ANDREW","SHAFFNER","2420341","WCHL Telluride 10U B"],
  ["PRESTON","SHAHAN","2993566","WCHL Grand Junction River Hawks 12U A"],
  ["BRYNN","SHANAHAN","3150683","Krivo Pee Wee A"],
  ["MILES","SHELTON","2336012","WCHL Grand Junction River Hawks 10U B"],
  ["QUINCY","SHOFF","2420569","WCHL Telluride 14U B"],
  ["DYLAN","SIBL","2300698","WCHL Grand Junction River Hawks 12U B"],
  ["JADEN","SIBL","2268382","WCHL Grand Junction River Hawks 14U B"],
  ["SHAI","SILBERMAN","2998511","WCHL Vail Mountaineers 14U A"],
  ["JOE","SILVESTRI","3255912","Boulder Pee Wee A"],
  ["SHEPHERD","SLOOTMAKER","2573233","CCYHL Durango 10U B"],
  ["EVAN","SOLOMON","3255907","Boulder Pee Wee A"],
  ["ANTHONY","SOTO","2420350","WCHL Telluride 10U B"],
  ["JAMISON","SPEE","3044375","WCHL Glenwood 14U B"],
  ["ALIVIAH","SPRING","2601387","WCHL Telluride 10U B"],
  ["COLBY","STADLER","3150670","Krivo Pee Wee A"],
  ["HENRY","STONE","2336086","WCHL Grand Junction River Hawks 10U A"],
  ["HUDSON","STONE","3009319","WCHL Grand Junction River Hawks 10U B"],
  ["JACKSON","STONE","3255906","Boulder Pee Wee A"],
  ["JACKSON","STONE","3255921","Boulder Pee Wee A"],
  ["PETER","STRENGTH","3255901","Boulder Pee Wee A"],
  ["PETER","STRENGTH","3255928","Boulder Pee Wee A"],
  ["MIRO","STRUBLE","2419365","WCHL WEHA WOLVERINES 12U A"],
  ["STANLEY","SZCZEPANSKI","2460889","CCYHL Fraser 12U B"],
  ["RADEK","TAYLOR","2246647","WCHL Summit 14U B"],
  ["EMILY","THOMAS","2542711","WCHL Summit 10U B White"],
  ["JACK","THOMAS","2419336","WCHL Summit 10U B Blue"],
  ["JUDAH","THOMAS","2460893","CCYHL Fraser 12U B"],
  ["JACOBY","THOMPSON","2420228","TT Durango 12U A"],
  ["TRENT","THOMPSON","2420217","TT Durango 12U A"],
  ["JAKUB","TOPOR","3037208","WCHL Vail Mountaineers 14U B White"],
  ["JACKSON","TREADWELL","2420343","WCHL Telluride 10U B"],
  ["QUINTON","TREVINO","2611296","WCHL Grand Junction River Hawks 14U B"],
  ["CAMDYN","TWISS","3150668","Krivo Pee Wee A"],
  ["MIA","ULEHLA","3150675","Krivo Pee Wee A"],
  ["BROCK","WADDELL","2420273","CCYHL Durango 12U B"],
  ["THOR","WALDOW","2460883","CCYHL Fraser 12U B"],
  ["PARKER","WEBB","2420244","CCYHL Durango 10U A"],
  ["LUKE","WHITE","3255909","Boulder Pee Wee A"],
  ["LUKE","WHITE","3255924","Boulder Pee Wee A"],
  ["KNOX","WHITE","2592282","WCHL Grand Junction River Hawks 10U B"],
  ["EVAN","WILCZEK","2420265","CCYHL Durango 12U A"],
  ["HUNTER","WILDMAN","2572909","CCYHL Durango 14U B"],
  ["LILY","WINGARD","2268412","WCHL Steamboat 14U A"],
  ["FINLEY","WINTERER","2998799","WCHL Telluride 10U B"],
  ["HENRY","WOLFE","2825343","RMHF Littleton Hawks 10U A White"],
  ["CASH","WOODS","2420257","CCYHL Durango 10U B"],
  ["BARRETT","ZENOR","3290398","WCHL Vail Mountaineers 10U B White"],
  ["ISAAC","ZEVIN","2419487","WCHL Aspen Leafs 14U A"]
];

// Build player lookup by team name for easy access when generating events
const PLAYERS_BY_TEAM = {};
PLAYERS_RAW.forEach(([firstName, lastName, playerID, teamName]) => {
  if (!PLAYERS_BY_TEAM[teamName]) PLAYERS_BY_TEAM[teamName] = [];
  PLAYERS_BY_TEAM[teamName].push({ firstName, lastName, playerID, teamName });
});

// Leagues & Divisions 
const LEAGUES = ["All Leagues", "WCHL", "CCYHL", "Independent"];

const DIVISIONS = ["All Divisions", "10U A", "10U B", "12U A", "12U B", "14U A", "14U B", "Independent"];

const DIVISION_COLORS = {
  "10U A": "#2ecc71",
  "10U B": "#3aa8d8",
  "12U A": "#9b59b6",
  "12U B": "#e67e22",
  "14U A": "#e74c3c",
  "14U B": "#f39c12",
  "Independent": "#888888",
};

const VENUES = {
  "10U A": "Dobson Ice Arena – Vail",
  "10U B": "Steamboat Ice Arena",
  "12U A": "Aspen Ice Garden",
  "12U B": "Summit County Ice Arena",
  "14U A": "Telluride Ice Rink",
  "14U B": "Grand Junction Ice Center",
  "Independent": "Home Arena",
};

const TIMES = ["4:00 PM", "5:30 PM", "7:00 PM", "8:30 PM", "6:00 PM", "3:30 PM"];

function getDivColor(division) {
  return DIVISION_COLORS[division] || "#888";
}

// Generate Matchup Events
function generateEvents() {
  const events = [];
  const divisions = ["10U A", "10U B", "12U A", "12U B", "14U A", "14U B", "Independent"];
  let id = 1;
  let dayOffset = 0;

  divisions.forEach(div => {
    const divTeams = TEAMS.filter(t => t.division === div);
    for (let i = 0; i + 1 < divTeams.length; i += 2) {
      const home = divTeams[i];
      const away = divTeams[i + 1];
      const date = new Date(2026, 2, 1 + (dayOffset % 27));
      dayOffset += 2;

      const players = [
        ...(PLAYERS_BY_TEAM[home.teamName] || []).slice(0, 6),
        ...(PLAYERS_BY_TEAM[away.teamName] || []).slice(0, 6),
      ];

      events.push({
        id: String(id++),
        title: `${home.teamName} vs ${away.teamName}`,
        start: date.toISOString().split("T")[0],
        backgroundColor: getDivColor(div),
        borderColor: "transparent",
        textColor: "#fff",
        extendedProps: {
          league: home.league,
          division: div,
          home: home.teamName,
          away: away.teamName,
          homeRecord: `${home.wins}W-${home.ties}T`,
          awayRecord: `${away.wins}W-${away.ties}T`,
          venue: VENUES[div],
          time: TIMES[id % TIMES.length],
          players,
        },
      });
    }
  });
  return events;
}

const ALL_EVENTS = generateEvents();

// Player Modal
function PlayerModal({ player, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
        <div style={S.avatar}>{player.firstName.charAt(0)}</div>
        <h2 style={S.modalTitle}>{player.firstName} {player.lastName}</h2>
        <p style={S.modalSub}>Player ID: #{player.playerID}</p>
        <div style={S.statBox}>
          <span style={S.statLabel}>TEAM</span>
          <span style={{ ...S.statVal, fontSize: 13 }}>{player.teamName}</span>
        </div>
      </div>
    </div>
  );
}

// Game Modal
function GameModal({ event, onClose }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const color = getDivColor(event.extendedProps.division);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <button style={S.closeBtn} onClick={onClose}>✕</button>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <span style={{ ...S.badge, background: color }}>{event.extendedProps.division}</span>
          <span style={{ ...S.badge, background: "rgba(255,255,255,0.15)" }}>{event.extendedProps.league}</span>
        </div>

        <h2 style={S.modalTitle}>{event.extendedProps.home}</h2>
        <p style={{ ...S.modalSub, marginBottom: 4 }}>vs</p>
        <h2 style={{ ...S.modalTitle, marginBottom: 4 }}>{event.extendedProps.away}</h2>
        <p style={S.modalSub}>{event.extendedProps.time} · {event.extendedProps.venue}</p>

        <div style={S.vsRow}>
          <div style={S.teamBox}>
            <div style={S.teamName}>{event.extendedProps.home}</div>
            <div style={S.teamRecord}>{event.extendedProps.homeRecord}</div>
          </div>
          <span style={S.vsLabel}>VS</span>
          <div style={S.teamBox}>
            <div style={S.teamName}>{event.extendedProps.away}</div>
            <div style={S.teamRecord}>{event.extendedProps.awayRecord}</div>
          </div>
        </div>

        {event.extendedProps.players.length > 0 && (
          <div style={S.rosterSection}>
            <p style={S.rosterHeading}>ROSTER — CLICK FOR PLAYER DETAILS</p>
            <div style={S.playerList}>
              {event.extendedProps.players.map(p => (
                <button key={p.playerID} style={S.playerChip} onClick={() => setSelectedPlayer(p)}>
                  <span style={{ ...S.chipDot, background: color }} />
                  {p.firstName} {p.lastName}
                  <span style={S.chipTeam}>ID #{p.playerID}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

// Main Component
export default function LeagueCalendar() {
  const [activeLeague, setActiveLeague] = useState("All Leagues");
  const [activeDivision, setActiveDivision] = useState("All Divisions");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = ALL_EVENTS.filter(e => {
    const leagueMatch = activeLeague === "All Leagues" || e.extendedProps.league === activeLeague;
    const divMatch = activeDivision === "All Divisions" || e.extendedProps.division === activeDivision;
    return leagueMatch && divMatch;
  });

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      <h1 style={S.heading}>WCHL LEAGUE SCHEDULE</h1>
      <p style={S.sub}>Western Colorado Hockey League · 2025–26 Season · 841 Players · 60 Teams</p>

      {/* League Filter */}
      <div style={{ ...S.filterRow, marginBottom: 10 }}>
        {LEAGUES.map(l => (
          <button
            key={l}
            onClick={() => setActiveLeague(l)}
            style={{
              ...S.filterBtn,
              ...(activeLeague === l ? S.filterBtnActive : {}),
            }}
          >{l}</button>
        ))}
      </div>

      {/* Division Filter */}
      <div style={S.filterRow}>
        {DIVISIONS.map(d => {
          const active = activeDivision === d;
          const color = DIVISION_COLORS[d];
          return (
            <button
              key={d}
              onClick={() => setActiveDivision(d)}
              style={{
                ...S.filterBtn,
                ...(active ? S.filterBtnActive : {}),
                ...(active && color ? { background: color, borderColor: color } : {}),
                ...(!active && color ? { borderColor: color } : {}),
              }}
            >
              {d !== "All Divisions" && !active && <span style={{ ...S.dot, background: color || "#888" }} />}
              {d}
            </button>
          );
        })}
      </div>

      {/* Calendar */}
      <div style={S.calWrap}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate="2026-03-01"
          events={filteredEvents}
          eventClick={info => setSelectedEvent(info.event)}
          headerToolbar={{ left: "prev", center: "title", right: "next" }}
          height="auto"
          dayMaxEvents={3}
        />
      </div>

      {/* Legend */}
      <div style={S.legend}>
        {Object.entries(DIVISION_COLORS).map(([div, color]) => (
          <div key={div} style={S.legendItem}>
            <span style={{ ...S.dot, background: color }} />
            <span style={S.legendLabel}>{div}</span>
          </div>
        ))}
      </div>

      {selectedEvent && <GameModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const S = {
  page:          { minHeight: "100vh", background: "#CC1010", padding: "32px 24px 48px", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.04em" },
  heading:       { textAlign: "center", fontSize: 42, color: "#fff", margin: "0 0 6px", letterSpacing: "0.12em", textShadow: "0 2px 12px rgba(0,0,0,0.4)" },
  sub:           { textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "system-ui,sans-serif", letterSpacing: "0.05em", margin: "0 0 20px" },
  filterRow:     { display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "0 auto 12px", maxWidth: 960 },
  filterBtn:     { background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#fff", padding: "6px 14px", fontSize: 12, fontFamily: "'Bebas Neue',Impact,sans-serif", letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" },
  filterBtnActive: { border: "2px solid #fff", background: "rgba(255,255,255,0.18)" },
  dot:           { width: 8, height: 8, borderRadius: "50%", display: "inline-block", flexShrink: 0 },
  calWrap:       { background: "#0d1b2a", borderRadius: 12, padding: 12, maxWidth: 960, margin: "0 auto", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" },
  legend:        { display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", margin: "16px auto 0", maxWidth: 960 },
  legendItem:    { display: "flex", alignItems: "center", gap: 6 },
  legendLabel:   { color: "rgba(255,255,255,0.7)", fontSize: 12, letterSpacing: "0.05em" },
  overlay:       { position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 },
  modal:         { background: "#0d1b2a", borderRadius: 14, padding: "28px 24px", width: "100%", maxWidth: 520, position: "relative", color: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", fontFamily: "'Bebas Neue',Impact,sans-serif", maxHeight: "88vh", overflowY: "auto" },
  closeBtn:      { position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 15, width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  badge:         { display: "inline-block", borderRadius: 4, padding: "2px 8px", fontSize: 11, letterSpacing: "0.08em", color: "#fff" },
  modalTitle:    { fontSize: 20, margin: "0 0 2px", letterSpacing: "0.04em", lineHeight: 1.2 },
  modalSub:      { fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 16px", fontFamily: "system-ui,sans-serif" },
  vsRow:         { display: "flex", alignItems: "center", gap: 10, margin: "0 0 20px" },
  teamBox:       { flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 8px", textAlign: "center" },
  teamName:      { fontSize: 13, letterSpacing: "0.03em", lineHeight: 1.2 },
  teamRecord:    { fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "system-ui,sans-serif", marginTop: 3 },
  vsLabel:       { fontSize: 16, color: "rgba(255,255,255,0.35)", flexShrink: 0 },
  rosterSection: { borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 },
  rosterHeading: { fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: "system-ui,sans-serif" },
  playerList:    { display: "flex", flexDirection: "column", gap: 5 },
  playerChip:    { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#fff", padding: "8px 12px", textAlign: "left", cursor: "pointer", fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 14, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 8 },
  chipDot:       { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  chipTeam:      { marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "system-ui,sans-serif" },
  avatar:        { width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,0.12)", fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  statBox:       { background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 18px", marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  statLabel:     { fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", fontFamily: "system-ui,sans-serif", flexShrink: 0 },
  statVal:       { fontSize: 15, color: "#fff", letterSpacing: "0.02em", fontFamily: "system-ui,sans-serif", textAlign: "right" },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
  .fc { font-family: 'Bebas Neue', Impact, sans-serif; letter-spacing: 0.04em; }
  .fc-toolbar-title { color: #fff !important; font-size: 20px !important; letter-spacing: 0.1em; }
  .fc-button { background: rgba(255,255,255,0.12) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: #fff !important; border-radius: 6px !important; }
  .fc-button:hover { background: rgba(255,255,255,0.22) !important; }
  .fc-col-header-cell-cushion { color: #fff !important; font-size: 14px; letter-spacing: 0.1em; }
  .fc-col-header-cell { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.08) !important; padding: 7px 0 !important; }
  .fc-daygrid-day { background: #0d1b2a !important; border-color: rgba(255,255,255,0.08) !important; border-style: dashed !important; }
  .fc-daygrid-day:hover { background: #122336 !important; }
  .fc-day-other .fc-daygrid-day-number { color: rgba(255,255,255,0.2) !important; }
  .fc-daygrid-day-number { color: rgba(255,255,255,0.7) !important; font-size: 12px; padding: 4px 7px !important; }
  .fc-event { border-radius: 4px !important; padding: 2px 5px !important; font-size: 10px !important; cursor: pointer !important; border: none !important; }
  .fc-event:hover { opacity: 0.85; filter: brightness(1.1); }
  .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
  .fc-today-button { display: none !important; }
  .fc-daygrid-day.fc-day-today { background: #0f2236 !important; }
  .fc-more-link { color: rgba(255,255,255,0.55) !important; font-size: 10px; }
`;
