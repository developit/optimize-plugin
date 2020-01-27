import MagicString from 'magic-string';

export default function rollupPluginStripComments () {
  return {
    name: 'simple-minify',
    renderChunk (source) {
      const comments = [];
      this.parse(source, { onComment: comments });
      if (comments.length) {
        const s = new MagicString(source);
        for (const comment of comments) {
          s.remove(comment.start, comment.end).trim();
        }
        return { code: s.toString(), map: null };
      }
      return null;
    }
  };
}
