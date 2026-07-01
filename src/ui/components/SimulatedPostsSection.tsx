import { h } from 'preact';

const SIMULATED_POSTS = [
  { title: "The Elegance of Wong Kar-wai's Frames", excerpt: "Time is a recurring motif in the cinema of Wong Kar-wai. It is felt in the ticking clocks of Hong Kong, in the slow-motion glances across narrow corridors..." },
  { title: "Neon Melancholy and Nostalgia", excerpt: "What is it about neon lighting that evokes such deep nostalgia? Perhaps it is the way it cuts through the obsidian night, illuminating faces but leaving eyes in shadow..." },
  { title: "The Silence after the Dialogue Stops", excerpt: "In the most profound films, the dialogue is just a bridge between silences. The true reflection happens when the screen fades to black and the waltz lingers..." }
];

export function SimulatedPostsSection() {
  return (
    <div className="simulated-blog-backdrop">
      {SIMULATED_POSTS.map((post, idx) => (
        <div key={idx} className="simulated-blog-post">
          <div className="simulated-blog-title">{post.title}</div>
          <p className="simulated-blog-excerpt">{post.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
