class Nip05 {
  isIrisAddress(nostrAddress: string) {
    return nostrAddress && nostrAddress.endsWith('@iris.to');
  }

  replace(nip05: string) {
    const nip05Parts = nip05.split('@');
    const nip05User = nip05Parts[0];
    const nip05Domain = nip05Parts[1];
    let newUrl;
    if (nip05Domain === 'iris.to') {
      if (nip05User === '_') {
        newUrl = 'iris';
      } else {
        newUrl = nip05User;
      }
    } else {
      if (nip05User === '_') {
        newUrl = nip05Domain;
      } else {
        newUrl = nip05;
      }
    }

    return newUrl;
  }

  replaceHistoryState(newUrl: string) {
    newUrl = window.location.pathname.replace(/[^/]+/, newUrl);
    const previousState = window.history.state;
    window.history.replaceState(previousState, '', newUrl);
  }
}

const nip05 = new Nip05();
export default nip05;
