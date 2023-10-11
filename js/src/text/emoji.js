import makeEmojiRegex from 'emoji-regex';

const g_emojiRegex = makeEmojiRegex();

export function embedEmojis(fragments) {
  const result = [];

  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];

    let match;
    let lastIndex = 0;

    while ((match = g_emojiRegex.exec(fragment.string))) {
      const index = match.index;
      const emoji = match[0];
      const emojiSize = fragment.attributes.fontSize;
      const chunk = fragment.string.slice(lastIndex, index + match[0].length);

      /*console.log(
        'found emoji fragment at %d: %s - %d, %d, %s',
        index,
        emoji,
        lastIndex,
        index,
        chunk
      );*/

      if (index > lastIndex) {
        // non-emoji text fragment
        result.push({
          string: fragment.string.slice(lastIndex, index),
          attributes: fragment.attributes,
        });
      }

      // emoji fragment
      result.push({
        string: String.fromCharCode(0xfffc), // unicode object substitution char
        attributes: {
          ...fragment.attributes,
          attachment: {
            width: emojiSize,
            height: emojiSize,
            yOffset: 0,
            emoji,
            // for image replacement, could pass 'image' here instead
          },
        },
      });

      lastIndex = index + emoji.length;
    }

    if (lastIndex < fragment.string.length) {
      result.push({
        string: fragment.string.slice(lastIndex),
        attributes: fragment.attributes,
      });
    }
  }

  return result;
}
