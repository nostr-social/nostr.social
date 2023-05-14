import { html, Component, render } from './js/spux.js'
import { getPath, getQueryStringValue, loadFile, saveFile } from './util.js'
import { findNestedObjectById } from './js/linkedobjects.js'

// import './css/style.css'
import './js/dior.js'

// await awaitForNostr();
// const userPublicKey = await window.nostr.getPublicKey();

function doc() {
  if (di.data.length) {
    return di.data[0]
  } else {
    return di.data
  }
}



class UserProfile extends Component {
  render() {
    const { userPublicKey, name, picture, about, banner, github } = this.props
    const key = getQueryStringValue('pubkey') || userPublicKey
    const irisLink = `https://iris.to/${key}`
    const canonical = `/.well-known/nostr/pubkey/${key}/index.json`
    const githubLink = github
    const shortenedPubKey = key ? key.slice(0, 16) : ''

    return html`
      <div class="user-profile card">
        ${banner ? html`<div class="banner"><img src="${banner}" alt="Banner" /></div>` : ''}
        <div class="profile-details">
          <img src="${picture}" alt="Profile Picture" class="user-picture" />
          <h2><span title="In the Nostr Strong Set">🛡️</span> ${name}</h2>
          
          ${key ? html`<p class="pubkey">Pubkey: <a href="${irisLink}" target="_blank">${shortenedPubKey}</a></p>` : ''}
          ${about ? html`<p class="about">${about}</p>` : ''}
          <div class="icons" style="display: flex; align-items: center;">
            ${github ? html`<a href="${githubLink}" target="_blank"><img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" width="18" height="18" /></a>` : ''}
          <a style="text-decoration:none" href="${canonical}" target="_blank">📥</a>
          </div>
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
        ${contacts?.map(app => {
      let contact = app.split(':')[2]
      let nick = contact.substring(0, 32)

      // if pubkey is set href is new pubkey
      // if in canonical directory href is ../pubkey/
      // if in non canonical directory href is /pubkey 
      function getHref() {
        let currentPath = new URL(window.location.href).pathname;
        let pubkey = getQueryStringValue('pubkey');

        if (pubkey) {
          return `?pubkey=${contact}`
        } else if (currentPath.includes('/.well-known/nostr/pubkey')) {
          return `../${contact}/`
        } else {
          return `/${contact}`
        }
      }
      var href = getHref()

      return html`
          <div class="contact">
            <a href="${href}" class="contact-link">${nick}</a>
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

    const serverUrl = getQueryStringValue('storage') || doc().storage || 'https://nosdav.nostr.rocks'
    const mode = getQueryStringValue('mode') || doc().m || 'm'
    const uri = getQueryStringValue('uri') || doc().uri || 'profile.json'

    const profilePubkey = getQueryStringValue('pubkey')

    var key
    if (doc().mainEntity['@id']) {
      key = doc().mainEntity['@id'].replace('nostr:pubkey:', '')
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
      data: {},
      error: null
    };
  }


  saveProfile = async () => {
    const { userPublicKey, serverUrl, mode, filename } = this.state;

    doc().mainEntity['@id'] = 'nostr:pubkey:' + userPublicKey;

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
    if (!doc().mainEntity['@id']) {
      doc().mainEntity['@id'] = 'nostr:pubkey:' + userPublicKey
      key = userPublicKey
    } else {
      key = doc().mainEntity['@id'].replace('nostr:pubkey:', '')
    }
    console.log(`Logged in with public key: ${userPublicKey}`);
    await this.setState({ userPublicKey: userPublicKey, apps: findNestedObjectById(di.data, 'nostr:pubkey:' + key)?.mainEntity?.app || [] })
    // Use an arrow function here
    var key
    if (doc().mainEntity && doc().mainEntity['@id']) {
      key = doc().mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.state.userPublicKey
    }

    //this.fetchProfile(key, () => this.render());
  };

  getRelay() {
    const relay = getQueryStringValue('relay') || doc().relay || 'wss://nostr-pub.wellorder.net';
    return relay
  }

  async componentDidMount() {
    var key = 'de7ecd1e2976a6adb2ffa5f4db81a7d812c8bb6698aa00dcf1e76adb55efd645'
    if (doc().mainEntity && doc().mainEntity['@id']) {
      key = getQueryStringValue("pubkey") || doc().mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      return
    }
    // this.fetchProfile(key, this.render.bind(this))

    var profile
    try {
      profile = await fetch(`/.well-known/nostr/pubkey/${key}/index.json`)
    } catch (e) {
      console.log('error', e)
      this.setState({ error: 'Error fetching profile. Please check your network connection and try again.' })
    }

    try {
      var data = await profile.json();
      console.log('### profile', data)
      this.setState({ data })

    } catch (e) {
      console.log('error', e)
      this.setState({ error: 'This profile is not yet set up.' })

    }


  }

  // fetchProfile.js
  fetchProfile(pubkey, render) {
    const NOSTR_RELAY_URL = this.getRelay()

    var key
    if (doc().mainEntity && doc().mainEntity['@id']) {
      key = doc().mainEntity['@id'].replace('nostr:pubkey:', '')
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

        doc().mainEntity.name = content.name
        doc().mainEntity.image = content.picture
        doc().mainEntity.url = content.website
        doc().mainEntity.description = content.about
        doc().mainEntity.banner = content.banner
        doc().mainEntity.github = content.identities?.[0]?.claim


        render();
      } else {
        console.error('Invalid or undefined data received:', msg.data);
      }
    };
  }

  render() {
    const { userPublicKey, fileContent, name, picture, website, about, banner, github, data, error } = this.state;

    if (error) {
      return html`
      ${error ? html`<div class="error">${error}</div><a href="/">Back</a>` : ''} 

      `
    }


    var key
    var me = data?.mainEntity
    if (!me) return
    console.log('### me', me)
    if (doc().mainEntity && doc().mainEntity['@id']) {
      key = doc().mainEntity['@id'].replace('nostr:pubkey:', '')
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
            github="${me.github}"
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

