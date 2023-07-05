
/* Optional vault name */
const vault = "Obsidian";

/* Optional folder name such as "Clippings/" */
const folder = "Links/";

/* Optional tags  */
const tags = "#clippings";

function getSelectionHtml() {
    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }
    return html;
}

function getFileName(fileName) {
    var userAgent = window.navigator.userAgent,
        platform = window.navigator.platform,
        windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];

    if (windowsPlatforms.indexOf(platform) !== -1) {
        fileName = fileName.replace(':', '').replace(/[/\\?%*|"<>]/g, '-');
    } else {
        fileName = fileName.replace(':', '').replace(/\//g, '-').replace(/\\/g, '-');
    }
    return fileName;
}

async function markdownify() {

    const [{
        default: Turndown
    }, {
        default: Readability
    }] = await Promise.all([
        import('https://unpkg.com/turndown@6.0.0?module'),
        import('https://unpkg.com/@tehshrike/readability@0.2.0')
    ]);

    const {
        title,
        byline,
        content
    } = new Readability(document.cloneNode(true)).parse();

    const fileName = getFileName(title);

    const selection = getSelectionHtml();

    if (selection) {
        var markdownify = selection;
    } else {
        var markdownify = content;
    }

    const markdownBody = new Turndown({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    }).turndown(markdownify);

    return {
        fileName,
        markdownBody,
        byline,
        title
    }
}

if (vault) {
    var vaultName = '&vault=' + encodeURIComponent(`${vault}`);
} else {
    var vaultName = '';
}

var date = new Date();

function convertDate(date) {
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth() + 1).toString();
    var dd = date.getDate().toString();
    var mmChars = mm.split('');
    var ddChars = dd.split('');
    return yyyy + '-' + (mmChars[1] ? mm : "0" + mmChars[0]) + '-' + (ddChars[1] ? dd : "0" + ddChars[0]);
}

const today = convertDate(date);

async function sendToObsidian() {
    let data = null;

    try {
        data = await markdownify()
        data.source = "[" + data.title + "](" + document.URL + ")"
    } catch (error) {
        console.error(error)
        data = {
            byline: "",
            source: document.URL,
            markdownBody: "Unable to clip due to error: " + error,
            fileName: date.toISOString()
        }
    }

    data.fileName = data.fileName.replaceAll('[', '(').replaceAll(']', ')').replaceAll(':', ';').replaceAll('/', ' ').replaceAll('\\', ' ').replaceAll('|', ' ').replaceAll('#', ' ').replaceAll('^', ' ');

    const limit = 15000;
    if (data.markdownBody.length > limit) {
        data.markdownBody = data.markdownBody.substring(0, limit)
    }

    const fileContent =
        "author:: " + data.byline + "\n"
        + "source:: " + data.source + "\n"
        + "clipped:: [[" + today + "]]\n"
        + "published:: \n\n"
        + tags + "\n\n"
        + data.markdownBody;

    const url = "obsidian://new?"
        + "file=" + encodeURIComponent(folder + data.fileName)
        + "&content=" + encodeURIComponent(fileContent)
        + vaultName;

    console.log(url);
    document.location.href = url;
}

(async () => {
    await sendToObsidian()
})()

