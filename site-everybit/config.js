/**
 * Created by admin on 2014-04-04.
 */

// TODO: change CONFIG to PuffConfig or something else less generic

CONFIG = {};

CONFIG.version = '0.4.1';

// Array of versions of Puff supported
// Not yet implemented
CONFIG.puffVersions = [];

CONFIG.userApi = 'http://162.219.162.56/c/users/api.php';
CONFIG.puffApi = 'http://162.219.162.56/c/puffs/api.php';

// Zone is added in route of every puff publishing using this code
CONFIG.zone = 'everybit';

CONFIG.url = 'http://www.everybit.com';
CONFIG.logo = 'img/EveryBitLogoLeft.svg';

/* See translate.js */
CONFIG.defaultPuff = '381yXZ2FqXvxAtbY3Csh2Q6X9ByNQUj1nbBWUMGWYoTeK8hHHtKwmsvc8gZKeDnCtfr49Ld9yAayWPV6R8mYQ1Aeh6MJtzEf';
CONFIG.faqPuff = 'AN1rKvtN7zq6EBhuU8EzBmnaHnb3CgvHa9q2B5LJEzeXs5FakhrArCQRtyBoKrywsupwQKZm5KzDd3yVZWJy4hVhwwdSp12di';

// List of supported content types
CONFIG.supportedContentTypes = ['image','bbcode','text','markdown','PGN','profile','file'];
CONFIG.unsupportedContentTypes = [];
CONFIG.defaultContentType = 'markdown';

CONFIG.users = [
    {
        username: 'anon',
        adminKey: '5KdVjQwjhMchrZudFVfeRiiPMdrN6rc4CouNh7KPZmh8iHEiWMx'
    },
    {
        username: 'forum',
        adminKey: '5JM6bnJmPHbtGGcukqjc1Yg8QcoDTorPK3NDGGy4w5fr46Rrhwn'
    }
];


CONFIG.users['anon'] = {adminKey: '5KdVjQwjhMchrZudFVfeRiiPMdrN6rc4CouNh7KPZmh8iHEiWMx'}
CONFIG.users['forum'] = {adminKey: '5JM6bnJmPHbtGGcukqjc1Yg8QcoDTorPK3NDGGy4w5fr46Rrhwn'}

// How much space to leave on left side of screen, in pixels
CONFIG.leftMargin = 20;

CONFIG.rightMargin = 20;

CONFIG.verticalPadding = 70;

// Side of the page you want the menu to go on
CONFIG.menuRight = false;

CONFIG.menuWidth = 400;

// Minimum width for advanced tools
CONFIG.minWidthAdvancedTools = 400;

/* Puffs must be at least this many characters to be submitted */
CONFIG.minimumPuffLength = 3;
CONFIG.PGNTimeout = 5;

// Space between puffs in regular view
CONFIG.minSpacing = 3;

// Extra space between puffs in relationship view
CONFIG.extraSpacing = 25;

CONFIG.arrowColors = [
     '#737CA1',
     '#4863A0',
     '#2B547E',
     '#2B3856',
     '#151B54',
     '#000080',
     '#342D7E',
     '#15317E',
     '#151B8D',
     '#0000A0',
     '#0020C2',
     '#0041C2',
     '#2554C7',
     '#1569C7',
     '#2B60DE',
     '#1F45FC',
     '#6960EC',
     '#736AFF',
     '#357EC7',
     '#368BC1',
     '#488AC7',
     '#3090C7',
     '#659EC7',
     '#87AFC7',
     '#95B9C7',
     '#728FCE',
     '#2B65EC',
     '#306EFF',
     '#157DEC',
     '#1589FF',
     '#6495ED',
     '#6698FF',
     '#38ACEC',
     '#56A5EC',
     '#5CB3FF',
     '#3BB9FF',
     '#79BAEC',
     '#82CAFA',
     '#82CAFF'
 ];
 

// background color
CONFIG.defaultBgcolor = "E0E0E0";


// configurations for network requests. eventually queries will track their timing and we'll automate these settings.
CONFIG.initLoadBatchSize = 50
CONFIG.initLoadGiveup    = 300

CONFIG.fillSlotsBatchSize = 50
CONFIG.fillSlotsGiveup    = 1000

CONFIG.globalBigBatchLimit = 2000


// default size limits
CONFIG.localStorageMemoryLimit =  3E6 //  3MB
CONFIG.inMemoryMemoryLimit     = 30E6 // 30MB

CONFIG.localStorageShellLimit =  1000 // maximum number of shells
CONFIG.inMemoryShellLimit     = 10000 // (shells are removed to compensate)

CONFIG.shellContentThreshold  =  1000 // size of uncompacted content

// for tableView
CONFIG.defaultColumn = {
    show: false,
    weight: 1,
    allowSort: false
}
CONFIG.maxGeneration = 5
CONFIG.maxParentGen = 3
CONFIG.maxChildGen = 4
CONFIG.initialLoad = 20
CONFIG.newLoad = 10