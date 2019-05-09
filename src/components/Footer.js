import React from 'react';

import { rhythm } from '../utils/typography';

class Footer extends React.Component {
  render() {
    return (
      <footer
        style={{
          marginTop: rhythm(2.5),
          paddingTop: rhythm(1),
        }}
      >
        <a
          href="https://mobile.twitter.com/xue_season"
          target="_blank"
          rel="noopener noreferrer"
        >
          Twitter
        </a>{' '}
        &bull;{' '}
        <a
          href="https://github.com/xueseason"
          target="_blank"
          rel="noopener noreferrer"
        >
          Github
        </a>{' '}
        &bull;{' '}
        <a
          href="https://www.instagram.com/xue_season/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>
      </footer>
    );
  }
}

export default Footer;
