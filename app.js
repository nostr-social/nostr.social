import { html, Component, render } from './js/spux.js'
import { getPath, getQueryStringValue, loadFile, saveFile } from './util.js'
import { findNestedObjectById } from './js/linkedobjects.js'

// import './css/style.css'
import './js/dior.js'

// await awaitForNostr();
// const userPublicKey = await window.nostr.getPublicKey();


function awaitForNostr() {
  return new Promise(resolve => {
    let intervalTime = 2;
    const maxIntervalTime = 500;
    const maxElapsedTime = 5000;
    let elapsedTime = 0;
    const intervalId = setInterval(() => {
      console.log(intervalTime, elapsedTime)
      elapsedTime += intervalTime;
      if (typeof window.nostr !== 'undefined') {
        console.log('nostr found')
        clearInterval(intervalId);
        resolve();
      } else if (elapsedTime >= maxElapsedTime) {
        clearInterval(intervalId);
        resolve();
      } else {
        intervalTime = Math.min(intervalTime * 1.5, maxIntervalTime);
      }
    }, intervalTime);
  });
}

class UserProfile extends Component {
  render() {
    const { userPublicKey, name, picture, about, banner } = this.props
    const key = getQueryStringValue('pubkey') || userPublicKey
    const irisLink = `https://iris.to/${key}`
    const canonical = `/.well-known/nostr/pubkey/${key}/index.json`
    const shortenedPubKey = key ? key.slice(0, 16) : ''

    return html`
      <div class="user-profile card">
        ${banner ? html`<div class="banner"><img src="${banner}" alt="Banner" /></div>` : ''}
        <div class="profile-details">
          <img src="${picture}" alt="Profile Picture" class="user-picture" />
          <a style="text-decoration:none" href="${canonical}" target="_blank" class="profile-link">🔗</a>
          <h2><span title="In the Nostr Strong Set">🛡️</span> ${name}</h2>
          
          ${key ? html`<p class="pubkey">Pubkey: <a href="${irisLink}" target="_blank">${shortenedPubKey}</a></p>` : ''}
          ${about ? html`<p class="about">${about}</p>` : ''}
        </div>
      </div>
    `
  }
}

class Contacts extends Component {
  render() {
    const { contacts, userPublicKey } = this.props

    return html`
      <div class="social-links card">
        <h3>Contacts</h3>
        ${contacts.map(app => {
      let contact = app.split(':')[2]
      let nick = contact.substring(0, 32)

      return html`
          <div class="contact">
            <a href="?pubkey=${contact}" class="contact-link">${nick}</a>
          </div>
        `
    })}

      </div>
    `
  }
}



// APP
export class App extends Component {
  constructor() {
    super();
    this.fetchProfile = this.fetchProfile.bind(this);

    const serverUrl = getQueryStringValue('storage') || di.data[0].storage || 'https://nosdav.nostr.rocks'
    const mode = getQueryStringValue('mode') || di.data[0].m || 'm'
    const uri = getQueryStringValue('uri') || di.data[0].uri || 'profile.json'

    const profilePubkey = getQueryStringValue('pubkey')

    var key
    if (di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.userPublicKey
    }

    var apps = findNestedObjectById(di.data, 'nostr:pubkey:' + key)?.mainEntity?.app || []

    this.state = {
      userPublicKey: null,
      filename: uri,
      fileContent: '',
      bookmarks: [],
      newBookmarkUrl: '',
      serverUrl: serverUrl,
      mode: mode,
      profilePubkey: profilePubkey,
      apps: apps,
      data: {}
    };
  }


  saveProfile = async () => {
    const { userPublicKey, serverUrl, mode, filename } = this.state;

    di.data[0].mainEntity['@id'] = 'nostr:pubkey:' + userPublicKey;

    async function replaceScriptTagContent() {
      const improvedRegex = /(<script[^>]*type\s*=\s*(['"])application[^>]*\2[^>]*>)([\s\S]*?)(<\/script>)/gim;

      // Fetch the current HTML page content
      const response = await fetch(location.href);
      const html = await response.text();

      // Replace the script tag content with a pretty-printed, stringified version of di.data
      const replacedScriptTagContent = html.replace(improvedRegex, (match, openingTag, quote, content, closingTag) => {
        return `${openingTag}${JSON.stringify(di.data, null, 2)}${closingTag}`;
      });

      const newHtml = replaceRelativePath(replacedScriptTagContent);
      // Log the new output to the console
      console.log(newHtml);

      return newHtml;
    }

    function replaceRelativePath(html) {
      const baseUrl = new URL(location.href);
      baseUrl.pathname = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
      const relativePathRegex = /(\.\/)/g;

      return html.replace(relativePathRegex, (match) => {
        return `${baseUrl.origin}${baseUrl.pathname}`;
      });
    }



    // Create a wrapper function to call the replaceScriptTagContent function
    var fileContent = await replaceScriptTagContent();
    // fileContent = replaceRelativePath(fileContent);

    const success = await saveFile(serverUrl, userPublicKey, filename, mode, fileContent);


    if (!success) {
      alert('Error saving profile');
    }
  };


  userLogin = async () => {
    await awaitForNostr();
    var userPublicKey = await window.nostr.getPublicKey();
    if (this.state.profilePubkey) {
      userPublicKey = this.state.profilePubkey;
    }
    var key
    if (!di.data[0].mainEntity['@id']) {
      di.data[0].mainEntity['@id'] = 'nostr:pubkey:' + userPublicKey
      key = userPublicKey
    } else {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    }
    console.log(`Logged in with public key: ${userPublicKey}`);
    await this.setState({ userPublicKey: userPublicKey, apps: findNestedObjectById(di.data, 'nostr:pubkey:' + key)?.mainEntity?.app || [] })
    // Use an arrow function here
    var key
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.state.userPublicKey
    }

    this.fetchProfile(key, () => this.render());
  };

  getRelay() {
    const relay = getQueryStringValue('relay') || di.data[0].relay || 'wss://nostr-pub.wellorder.net';
    return relay
  }

  async componentDidMount() {
    var key = 'de7ecd1e2976a6adb2ffa5f4db81a7d812c8bb6698aa00dcf1e76adb55efd645'
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = getQueryStringValue("pubkey") || di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      return
    }
    this.fetchProfile(key, this.render.bind(this))

    var profile = await fetch(`/.well-known/nostr/pubkey/${key}/index.json`)
    var data = await profile.json();
    console.log('### profile', data)
    this.setState({ data })
  }

  // fetchProfile.js
  fetchProfile(pubkey, render) {
    const NOSTR_RELAY_URL = this.getRelay()

    var key
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.state.userPublicKey
    }

    let wss = new WebSocket(NOSTR_RELAY_URL);
    let kind = 0;
    let id = 'profile';
    wss.onopen = function () {
      const req = `["REQ", "${id}", { "kinds": [${kind}], "authors": ["${key}"] }]`;
      wss.send(req);
    };

    // Use an arrow function here
    wss.onmessage = (msg) => {
      const response = JSON.parse(msg.data);

      if (response && response[2]) {
        const data = response[2];
        console.log(data);
        const content = JSON.parse(data.content);

        this.setState({
          name: content.name,
          picture: content.picture,
          website: content.website,
          about: content.about,
          banner: content.banner,
          github: content.identities?.[0]?.claim,
        });

        di.data[0].mainEntity.name = content.name
        di.data[0].mainEntity.image = content.picture
        di.data[0].mainEntity.url = content.website
        di.data[0].mainEntity.description = content.about
        di.data[0].mainEntity.banner = content.banner
        di.data[0].mainEntity.github = content.identities?.[0]?.claim


        render();
      } else {
        console.error('Invalid or undefined data received:', msg.data);
      }
    };
  }

  render() {
    const { userPublicKey, fileContent, name, picture, website, about, banner, github, data } = this.state;
    var key
    var me = data?.mainEntity
    if (!me) return
    console.log('### me', me)
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.state.userPublicKey
    }

    var apps = findNestedObjectById(di.data, 'nostr:pubkey:' + key)?.app || []

    const uriWithLabels = apps.map((uri) => {
      const foundObject = findNestedObjectById(di.data, uri);
      const label = foundObject ? foundObject.label : null;
      return { uri, label };
    });

    console.log(uriWithLabels);

    return html`
      <div id="container">

        <div class="content">
          <${UserProfile}
            userPublicKey="${key}"
            name="${me?.name}"
            picture="${me?.picture}"
            about="${me.about}"
            banner="${me.banner}"
          />
          <${Contacts}
            contacts="${me.following}" userPublicKey="${key}"
          />
        </div>

      </div>
    `
  }
}

render(html` <${App} /> `, document.body)
