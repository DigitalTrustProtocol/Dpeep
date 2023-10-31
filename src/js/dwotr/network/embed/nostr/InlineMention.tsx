// mentions like #[3], can refer to event or user

import Embed, { EmbedData } from '../index';

const InlineMention: Embed = {
  regex: /#\[([0-9]+)]/g,
  component: ({ match, event }) => {
    let r = new EmbedData();
    if (!event?.tags) return r;
    
    const tag = event.tags[parseInt(match)];
    if (tag) {
      const [type, id] = tag;
      if (type === 'p') {
        r.setAuthor({ author: id });
      } else if (type === 'e') {
        r.setEvent({ id });
      } 
    }
    return r;
  },
};

export default InlineMention;
