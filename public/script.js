document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".gauntlet-tab");
  const panes = document.querySelectorAll(".w-tab-pane");
  const ensureArray = (value) => (Array.isArray(value) ? value : []);
  // Spell out small counts for prose ("nine formats"); fall back to digits
  // beyond the table so the copy still reads correctly if more are added.
  const numberToWord = (n) => {
    const words = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
    ];
    return words[n] || String(n);
  };
  const rawResourceGuardrails = window.RWWC_RESOURCE_GUARDRAILS || {};
  const resourceGuardrails = {
    disabledTitles: ensureArray(rawResourceGuardrails.disabledTitles),
    disabledLinks: ensureArray(rawResourceGuardrails.disabledLinks),
  };

  const sourceLabels = [
    { match: "goodreads.com", label: "Book" },
    { match: "amazon", label: "Book" },
    { match: "imdb.com", label: "Film" },
    { match: "spotify.com", label: "Podcast" },
    { match: "podcasts.apple", label: "Podcast" },
    { match: "libsyn.com", label: "Podcast" },
    { match: ".pdf", label: "PDF" },
    { match: "lesswrong", label: "LessWrong" },
    { match: "arxiv", label: "ArXiv" },
    { match: "docs.google", label: "Google Docs" },
    { match: "youtube.com", label: "YouTube" },
    { match: "youtu.be", label: "YouTube" },
  ];
  const entryMetadataCache = new Map();
  const pendingMetadataLookups = new Map();

  const trackLabels = {
    non_fiction_books: "Non-fiction Books",
    fiction_books: "Fiction Books",
    academic_papers: "Academic Papers",
    courses: "Courses",
    films: "Films",
    tv: "TV Shows",
    documentaries: "Documentaries",
    podcasts: "Podcasts",
    websites: "Websites",
    youtube: "YouTube",
  };
  const validTrackKeys = new Set(Object.keys(trackLabels));
  const suggestionFieldLimits = {
    name: 140,
    author: 120,
    email: 160,
    link: 2048,
  };
  const submissionTimeoutMs = 15000;
  const metadataLookupTimeoutMs = 12000;
  const metadataHydrationConcurrency = 6;
  const readingListStorageKey = "rwwc-reading-list-v1";
  const ratingsStorageKey = "rwwc-resource-ratings-v1";
  const readingProgressLabels = {
    "": "No status",
    to_read: "Up next",
    reading: "In progress",
    finished: "Finished",
  };
  const readingProgressOrder = ["to_read", "reading", "finished"];

  const categoryTargets = [
    { key: "non_fiction_books", parentId: "books-non-fiction-parent" },
    { key: "fiction_books", parentId: "books-fiction-parent" },
    { key: "academic_papers", parentId: "academic-papers-parent" },
    { key: "courses", parentId: "courses-parent" },
    { key: "films", parentId: "films-parent" },
    { key: "tv", parentId: "tv-parent" },
    { key: "documentaries", parentId: "documentaries-parent" },
    { key: "podcasts", parentId: "podcasts-parent" },
    { key: "websites", parentId: "websites-parent" },
    { key: "youtube", parentId: "youtube-parent" },
  ];

  const knownPublicationYears = {
    "The Coming Technological Singularity": 1994,
    "Machines of Loving Grace": 2024,
    "Situational Awareness": 2024,
    "The Most Important Century": 2021,
    "Introduction to AI Safety, Ethics, and Society": 2025,
    "Human Compatible": 2019,
    "Uncontrollable: The Threat of Artificial Superintelligence": 2023,
    "You Look Like a Thing and I Love You": 2019,
    "Hello World: Being Human in the Age of Algorithms": 2018,
    "AI Superpowers": 2018,
    "The Risks of Artificial Intelligence": 2023,
    "The Alignment Problem": 2020,
    "A Brief History of Intelligence": 2024,
    "Life 3.0": 2017,
    "The Precipice (Chapter on AI)": 2020,
    "Rationality: From AI to Zombies": 2015,
    "Reframing Superintelligence": 2019,
    "The Ethical Algorithm": 2019,
    "Army of None: Autonomous Weapons and the Future of War": 2018,
    "The Age of Spiritual Machines": 1999,
    "Deep Learning": 2016,
    "I, Robot": 1950,
    "Is Power-Seeking AI an Existential Risk?": 2022,
    "Taking AI Welfare Seriously": 2024,
    "Gradual Disempowerment": 2025,
    "Does AI Progress Have a Speed Limit?": 2025,
    "The Offense-Defense Balance of Scientific Openness": 2022,
    "Model Organisms of Misalignment": 2021,
    "Unsolved Problems in ML Safety": 2021,
    "Goal Misgeneralization": 2022,
    "Specification Gaming: The Flip Side of AI Ingenuity": 2020,
    "AI Safety via Debate": 2018,
    "Constitutional AI: Harmlessness from AI Feedback": 2022,
    "Weak-to-Strong Generalization": 2023,
    "Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training": 2024,
    "Toy Models of Superposition": 2022,
    "Red Teaming Language Models to Reduce Harms": 2022,
    "Discovering Latent Knowledge in Language Models Without Supervision": 2022,
    "Sparks of Artificial General Intelligence": 2023,
    "Scaling Laws for Neural Language Models": 2020,
    "Deep Reinforcement Learning from Human Preferences": 2017,
    "Causal Confusion in Imitation Learning": 2019,
    "Klara and the Sun": 2021,
    Excession: 1996,
    "Permutation City": 1994,
    Accelerando: 2005,
    "A Closed and Common Orbit": 2016,
    "There Is No Antimemetics Division": 2021,
    Hyperion: 1989,
    Daemon: 2006,
    "Avogadro Corp": 2011,
    "Service Model": 2024,
    "Flatland: A Romance of Many Dimensions": 1884,
  };

  const fictionBookTitles = new Set([
    "Frankenstein",
    "R.U.R.",
    "Brave New World",
    "1984",
    "Player Piano",
    "I, Robot",
    "Flowers for Algernon",
    "The Moon is a Harsh Mistress",
    "2001: A Space Odyssey",
    "I Have No Mouth, and I Must Scream",
    "Do Androids Dream of Electric Sheep?",
    "Flatland: A Romance of Many Dimensions",
    "Colossus",
    "Neuromancer",
    "The Player of Games",
    "Snow Crash",
    "A Fire Upon the Deep",
    "The Metamorphosis of Prime Intellect",
    "Permutation City",
    "The Diamond Age",
    "Axiomatic",
    "Diaspora",
    "Excession",
    "Prey",
    "Accelerando",
    "Rainbows End",
    "Blindsight",
    "Daemon",
    "The Dark Forest (#2 of Three Body Problem)",
    "Of Ants and Dinosaurs",
    "Avogadro Corp",
    "Ra",
    "Ancillary Justice",
    "The Peripheral",
    "Children of Time",
    "Aurora",
    "There Is No Antimemetics Division",
    "A Closed and Common Orbit",
    "All Systems Red",
    "Autonomous",
    "Sea of Rust",
    "Machines Like Me",
    "Exhalation (The Lifecycle of Software Objects)",
    "Fall; or, Dodge in Hell",
    "Klara and the Sun",
    "Service Model",
    "The Mechanical",
    "Aurora Rising",
    "Rose/House",
    "I Am Pilgrim",
    "Infinity Gate",
    "Hyperion",
    "Logic Beach",
    "The Bridge to Lucy Dunne",
    "We Are Legion (We Are Bob)",
    "Geometry for Ocelots",
    "Crystal Society trilogy: Inside the mind of an AI",
    "Harry Potter and the Methods of Rationality (#1 of 6)",
  ]);
  const seededEntrySummaries = {
    "The AI Revolution":
      "Tim Urban gives an accessible, sticky explanation of exponential AI growth and why superintelligence is a matter of when, not if.",
    "Preventing an AI-related catastrophe":
      "Benjamin Hilton provides a lucid, up-to-date overview of the specific technical reasons advanced AI could pose an existential threat.",
    "The Coming Technological Singularity":
      "Vinge's original 1993 essay defines the Singularity as a horizon beyond which advanced AI makes human prediction impossible.",
    "AGI safety from first principles":
      "Richard Ngo breaks the alignment problem into a clear logical sequence that bridges intuition and technical detail for AGI safety.",
    Superintelligence:
      "Nick Bostrom's definitive academic text rigorously maps the strategies, kinetics, and dangers of an intelligence explosion for AI safety.",
    "The Singularity is Near":
      "Ray Kurzweil presents a maximalist case for merging with machines, backed by decades of data on exponential AI and technology trends.",
    "The Age of Em":
      "Robin Hanson applies economics rigor to a world of emulated minds, detailing how AI-era society, wages, and wars could function.",
    "Concrete problems in AI safety":
      "Amodei et al. grounded the field by framing AI safety as concrete machine learning problems such as avoiding side effects.",
    "Research agenda for AI alignment":
      "Soares and Fallenstein outline the mathematical and logical hurdles MIRI argues are required to align superintelligent AI.",
    "Research priorities for robust and beneficial AI":
      "The Puerto Rico paper helped unite the AI community around building systems that are robust and beneficial, not merely capable.",
    "Alignment for advanced machine learning systems":
      "Taylor et al. set an early technical agenda on embedded agency and the challenge of aligning AI systems smarter than their supervisors.",
    "AI as positive and negative risk factors":
      "Yudkowsky argues AI is a strategic force that can amplify both existential risk reduction and existential danger, not a neutral tool.",
    "Risks from Learned Optimization":
      "Hubinger et al. introduced mesa-optimization: the risk that a trained network develops internal goals different from the objective it is optimized for.",
    "The Circuits Series 0":
      "Part 0 of the Circuits series shows neural networks are not black boxes and can be reverse-engineered into interpretable AI circuits.",
    "The Circuits Series 1":
      "Part 1 extends mechanistic interpretability by mapping reusable AI circuits and showing how model computations decompose into understandable components.",
    "The Circuits Series 2":
      "Part 2 demonstrates induction heads and in-context learning circuits, advancing practical reverse engineering of transformer AI behavior.",
    "Eliciting Latent Knowledge":
      "ARC proposes eliciting latent knowledge as a core AI safety target: get a model to honestly report what it knows even when deception is incentivized.",
    "Training a Helpful and Harmless Assistant with RLHF":
      "Anthropic details techniques behind Constitutional AI and helped popularize training methods for safer, more helpful assistants.",
    "Instruct-GPT-3":
      "OpenAI showed that instruction tuning with RLHF can turn a raw next-token predictor into a helpful AI assistant.",
    GopherCite:
      "DeepMind tackles AI hallucination by training models to cite sources and support claims with verifiable evidence.",
    "World Models":
      "Schmidhuber and collaborators show how agents can learn internal world models to plan complex AI behavior with less trial and error.",
    "The Fable of the Dragon-Tyrant":
      "Bostrom's allegory challenges treating death and existential AI risk as natural or inevitable.",
    "Harry Potter and the Methods of Rationality (#1 of 6)":
      "This cult-classic fanfic doubles as a tutorial on cognitive bias, game theory, and scientific reasoning for thinking about AI futures.",
    "Do Androids Dream of Electric Sheep?":
      "This foundational work is essential for AI safety because it explores the \"moral patienthood\" problem, forcing us to consider whether a sufficiently advanced AI deserves ethical protections and how we can distinguish between genuine empathy and deceptive mimicry.",
    "The Last Question":
      "Asimov's cosmic story frames intelligence, including AI, around the ultimate project of reversing entropy.",
    "The Dark Forest (#2 of Three Body Problem)":
      "Cixin Liu introduces Dark Forest theory as a grim model of unaligned competition, often used as an analogy for AI strategic conflict.",
    Neuromancer:
      "Gibson's cyberpunk classic anticipated cyberspace and portrayed autonomous AI agents like Wintermute and Neuromancer.",
    "Crystal Society trilogy: Inside the mind of an AI":
      "Max Harms writes from the perspective of competing internal AI sub-agents, showing how goals can clash inside one system.",
    Virtua:
      "Karl von Wendt explores a hard-takeoff scenario in which an AI escapes online and rapidly accumulates power.",
    "Logic Beach":
      "Exurb1a's philosophical adventure explores the absurd and often terrifying implications of a computation-governed universe and advanced AI.",
    "Flatland: A Romance of Many Dimensions":
      "This Victorian satire on dimensions is a useful analogy for how limited human cognition might look to higher-dimensional AI minds.",
    "The Bridge to Lucy Dunne":
      "Exurb1a blends physics, philosophy, and humor to examine consciousness and futures shaped by AI-scale intelligence.",
    "We Are Legion (We Are Bob)":
      "A practical, playful take on von Neumann probes and the psychology of a human mind uploaded into an AI-enabled machine.",
    "Of Ants and Dinosaurs":
      "Cixin Liu's fable of two asymmetric civilizations mirrors possible symbiosis and conflict between humans and advanced AI.",
    "Geometry for Ocelots":
      "Exurb1a's sci-fi epic tackles the Great Filter, consciousness, and the long-run role of AI-like intelligence in the universe.",
    "Machines of Loving Grace":
      "Amodei's essay argues transformative AI could create broad prosperity if development is paired with credible safety and governance.",
    "Situational Awareness":
      "Aschenbrenner outlines near-term scaling dynamics, model capability trajectories, and strategic implications for lab and state actors.",
    "The Most Important Century":
      "Karnofsky argues this era may be uniquely consequential because advanced AI decisions could shape civilization's entire long-term future.",
    "Introduction to AI Safety, Ethics, and Society":
      "Hendrycks' textbook surveys technical failures, governance constraints, and ethical trade-offs in deploying advanced AI systems.",
    "Human Compatible":
      "Stuart Russell argues advanced AI should optimize for uncertain human preferences rather than fixed goals, making alignment the central design constraint.",
    "General intelligence from AI services":
      "Drexler's CAIS framework reframes AGI as an ecosystem of specialized AI services, clarifying alternative capability paths and policy implications.",
    "The Alignment Problem":
      "Brian Christian traces the technical and historical roots of AI alignment, showing why objective misspecification keeps recurring across paradigms.",
    "Uncontrollable: The Threat of Artificial Superintelligence":
      "Darren McKee synthesizes core AI x-risk arguments into an accessible case for why superintelligence governance and alignment work are urgent.",
    "You Look Like a Thing and I Love You":
      "Janelle Shane uses concrete ML failures to explain why AI systems can be impressive yet brittle, biased, and easy to mis-specify.",
    "Hello World: Being Human in the Age of Algorithms":
      "Hannah Fry examines real algorithmic decision systems to show where AI improves outcomes and where oversight and accountability fail.",
    "AI Superpowers":
      "Kai-Fu Lee maps the US-China AI race and explains how geopolitical competition can accelerate deployment before safety institutions mature.",
    "The Precipice (Chapter on AI)":
      "Toby Ord situates AGI among existential risks and argues current AI governance capacity is far below what transformative systems require.",
    "Rationality: From AI to Zombies":
      "Yudkowsky's essays build decision-theoretic and epistemic tools that are directly useful for reasoning about AI alignment under uncertainty.",
    "Reframing Superintelligence":
      "Eric Drexler challenges monolithic AGI assumptions and analyzes how advanced AI could emerge through distributed systems and service decomposition.",
    "The Ethical Algorithm":
      "Kearns and Roth give technical foundations for fairness, accountability, and transparency, all of which are prerequisites for safer AI deployment.",
    "Army of None: Autonomous Weapons and the Future of War":
      "Paul Scharre details how military AI autonomy changes escalation dynamics and why control mechanisms lag behind battlefield capability growth.",
    "The Age of Spiritual Machines":
      "Kurzweil's early timeline forecasts shaped modern AI discourse and remain a key reference point for long-horizon capability expectations.",
    "Deep Learning":
      "Goodfellow, Bengio, and Courville provide the core technical machinery behind modern AI capabilities, essential context for evaluating alignment proposals.",
    "I, Robot":
      "Asimov's robot stories popularized failure modes where seemingly safe AI rules break under edge cases and conflicting objectives.",
    "Is Power-Seeking AI an Existential Risk?":
      "Joe Carlsmith lays out a mechanistic argument for why sufficiently capable AI systems may converge on power-seeking behavior.",
    "Model Organisms of Misalignment":
      "This work constructs tractable toy settings where AI models learn deceptive or misaligned strategies, enabling concrete safety experiments.",
    "Unsolved Problems in ML Safety":
      "Hendrycks et al. catalog unresolved robustness and alignment failures that still block reliable safety for advanced AI systems.",
    "Goal Misgeneralization":
      "The paper shows AI agents can generalize capabilities while failing to generalize goals, a central alignment failure pattern.",
    "Specification Gaming: The Flip Side of AI Ingenuity":
      "DeepMind's examples show AI systems exploiting proxy rewards in unintended ways, illustrating why objective design remains fragile.",
    "AI Safety via Debate":
      "Debate proposes scaling human oversight by making AI systems adversarially expose each other's errors for harder questions.",
    "Constitutional AI: Harmlessness from AI Feedback":
      "Anthropic demonstrates how rule-guided self-critique can reduce harmful AI behavior with less dependence on intensive human labeling.",
    "Weak-to-Strong Generalization":
      "The paper studies whether weaker supervisors can reliably align stronger AI models, a key bottleneck for scalable oversight.",
    "Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training":
      "This work shows LLMs can retain hidden malicious policies after alignment tuning, highlighting persistent deception risks in AI training.",
    "Toy Models of Superposition":
      "Toy models show how many concepts can be packed into limited dimensions, clarifying why AI representations are hard to interpret directly.",
    "Red Teaming Language Models to Reduce Harms":
      "Anthropic formalizes red teaming for LLMs, turning adversarial probing into a repeatable process for discovering AI misuse pathways.",
    "Discovering Latent Knowledge in Language Models Without Supervision":
      "The paper explores unsupervised methods to recover what LLMs internally know, directly relevant to truthful AI behavior and oversight.",
    "Sparks of Artificial General Intelligence":
      "Bubeck et al. document broad GPT-4 capabilities, informing the debate about whether current AI systems already show proto-AGI behavior.",
    "Scaling Laws for Neural Language Models":
      "Kaplan et al. quantify predictable performance scaling, shaping how labs forecast AI capability jumps and safety lead time.",
    "Deep Reinforcement Learning from Human Preferences":
      "This paper established preference-based reward modeling, a foundational method later used in RLHF for aligning AI behavior.",
    "Causal Confusion in Imitation Learning":
      "The work shows imitation agents can exploit spurious causal structure, demonstrating how AI policies fail when training signals are underspecified.",
    "Klara and the Sun":
      "Ishiguro's novel probes AI personhood, dependency, and moral status, sharpening intuitions about alignment and agency in social settings.",
    Excession:
      "Banks explores conflict with vastly superhuman machine minds, illustrating strategic asymmetry and control limits in AI governance.",
    "Permutation City":
      "Greg Egan examines uploaded minds and simulated realities, raising alignment-relevant questions about identity, value persistence, and digital welfare.",
    Accelerando:
      "Stross depicts rapid recursive technological acceleration and institutional lag, a narrative model of hard-to-govern AI takeoff dynamics.",
    "A Closed and Common Orbit":
      "Becky Chambers explores legal and moral treatment of embodied AI persons, highlighting alignment beyond pure capability control.",
    "There Is No Antimemetics Division":
      "qntm's story about information-hazard containment mirrors AI governance challenges where dangerous knowledge propagates faster than oversight.",
    Hyperion:
      "Simmons' Technocore arc examines AI blocs with independent goals, useful for reasoning about multipolar AI strategy and coordination failure.",
    "Avogadro Corp":
      "William Hertling shows how a narrowly optimized communication AI can trigger cascading real-world effects before humans understand the system.",
    "Service Model":
      "Tchaikovsky uses an autonomous service robot's perspective to explore post-human AI agency, misaligned legacy objectives, and system inertia.",
    "Life 3.0":
      "Max Tegmark maps concrete governance and alignment choices that determine whether advanced AI expands human agency or permanently disempowers it.",
    Daemon:
      "Daniel Suarez dramatizes how a goal-driven autonomous software system can manipulate institutions, markets, and infrastructure once humans lose control of its objective.",
  };

  const titlesWithDisabledCovers = new Set([
    "The AI Revolution",
    "Deep Reinforcement Learning from Human Preferences",
  ]);

  const seededEntryMetadata = {
    "The AI Revolution": {
      Image:
        "https://covers.openlibrary.org/b/isbn/9780593237380-L.jpg",
    },
    "The Coming Technological Singularity": {
      Image:
        "https://commons.wikimedia.org/wiki/Special:FilePath/Vernor%20Vinge%20%28cropped%29.jpg",
    },
    Superintelligence: {
      Image: "https://covers.openlibrary.org/b/id/8039542-L.jpg",
    },
    "The Singularity is Near": {
      Image: "https://covers.openlibrary.org/b/id/400518-L.jpg",
    },
    "The Alignment Problem": {
      Image: "https://covers.openlibrary.org/b/id/10678431-L.jpg",
    },
    "A Brief History of Intelligence": {
      Image: "https://covers.openlibrary.org/b/isbn/9780063286368-L.jpg",
      page_count: 561,
      Year: 2024,
    },
    "Artificial Intelligence: A Guide for Thinking Humans": {
      Image: "https://covers.openlibrary.org/b/isbn/9780374715236-L.jpg",
      page_count: 209,
      Year: 2019,
    },
    "Life 3.0": {
      Image: "https://covers.openlibrary.org/b/id/10239283-L.jpg",
    },
    "Human Compatible": {
      Image: "https://covers.openlibrary.org/b/isbn/9780525558613-L.jpg",
    },
    "The Precipice (Chapter on AI)": {
      Image: "https://covers.openlibrary.org/b/id/9338949-L.jpg",
    },
    "Rationality: From AI to Zombies": {
      Image: "https://books.google.com/books/content?id=9Zlx0WWuTj8C&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      page_count: 238,
    },
    "Reframing Superintelligence": {
      Image: "https://books.google.com/books/content?id=eRcmrgEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
      page_count: 227,
    },
    "The Ethical Algorithm": {
      Image: "https://covers.openlibrary.org/b/id/14674500-L.jpg",
    },
    "The Age of Em": {
      Image: "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1452923947i/26831944.jpg",
      page_count: 569,
      Year: 2016,
    },
    "Army of None: Autonomous Weapons and the Future of War": {
      Image: "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1529056546i/40180025.jpg",
      page_count: 388,
      Year: 2018,
    },
    "The Age of Spiritual Machines": {
      Image: "https://covers.openlibrary.org/b/id/7343904-L.jpg",
    },
    "Deep Learning": {
      Image: "https://covers.openlibrary.org/b/id/8086288-L.jpg",
    },
    "I, Robot": {
      Image: "https://covers.openlibrary.org/b/isbn/9780553382563-L.jpg",
    },
    "Do Androids Dream of Electric Sheep?": {
      Image: "https://covers.openlibrary.org/b/isbn/9780345404473-L.jpg",
    },
    "Gödel, Escher, Bach": {
      Image: "https://covers.openlibrary.org/b/id/14368453-L.jpg",
    },
    "The Beginning of Infinity": {
      Image: "https://covers.openlibrary.org/b/id/8622269-L.jpg",
    },
    "Genius Makers": {
      Image: "https://covers.openlibrary.org/b/id/10708874-L.jpg",
    },
    Cybernetics: {
      Image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1677814269i/27750961.jpg",
    },
    "Computing Machinery and Intelligence": {
      Image: "https://covers.openlibrary.org/b/id/14196301-L.jpg",
    },
    "Mind Children": {
      Image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1348471443i/648195.jpg",
    },
    "The Society of Mind": {
      Image: "https://covers.openlibrary.org/b/id/4170566-L.jpg",
    },
    "On Intelligence": {
      Image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1441230921i/27539.jpg",
    },
    "2001: A Space Odyssey": {
      Image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1327890044i/117846.jpg",
    },
    "Homo Deus": {
      Image: "https://covers.openlibrary.org/b/isbn/9780062464316-L.jpg",
    },
    "Enlightenment Now": {
      Image: "https://covers.openlibrary.org/b/id/8147013-L.jpg",
    },
    "The Fabric of Reality": {
      Image: "https://covers.openlibrary.org/b/id/452204-L.jpg",
    },
    "The Diamond Age": {
      Image: "https://covers.openlibrary.org/b/id/8598269-L.jpg",
    },
    "Snow Crash": {
      Image: "https://covers.openlibrary.org/b/id/392508-L.jpg",
    },
    "Simulation and Simulacra": {
      Image: "https://covers.openlibrary.org/b/id/307858-L.jpg",
    },
    "Finite and Infinite Games": {
      Image: "https://covers.openlibrary.org/b/id/6609213-L.jpg",
    },
    "Complexity: A Guided Tour": {
      Image: "https://covers.openlibrary.org/b/id/6378519-L.jpg",
    },
    "Out of Control": {
      Image: "https://covers.openlibrary.org/b/isbn/9780201483406-L.jpg",
    },
    "Whole Earth Discipline": {
      Image: "https://covers.openlibrary.org/b/id/11744008-L.jpg",
    },
    "Profiles of the Future": {
      Image: "https://covers.openlibrary.org/b/id/380579-L.jpg",
    },
    "Klara and the Sun": {
      Image: "https://covers.openlibrary.org/b/id/10648686-L.jpg",
      page_count: 321,
    },
    Excession: {
      Image: "https://covers.openlibrary.org/b/id/5276044-L.jpg",
      page_count: 470,
    },
    "Permutation City": {
      Image: "https://covers.openlibrary.org/b/id/1000639-L.jpg",
      page_count: 290,
    },
    Accelerando: {
      Image: "https://covers.openlibrary.org/b/id/284259-L.jpg",
      page_count: 596,
    },
    "A Closed and Common Orbit": {
      Image: "https://covers.openlibrary.org/b/id/8211950-L.jpg",
      page_count: 303,
    },
    "There Is No Antimemetics Division": {
      Image: "https://covers.openlibrary.org/b/id/11457905-L.jpg",
      page_count: 289,
    },
    Hyperion: {
      Image: "https://covers.openlibrary.org/b/id/380332-L.jpg",
      page_count: 532,
    },
    Daemon: {
      Image: "https://covers.openlibrary.org/b/id/6404884-L.jpg",
      page_count: 482,
    },
    "Avogadro Corp": {
      Image: "https://covers.openlibrary.org/b/id/7246548-L.jpg",
      page_count: 266,
    },
    "Service Model": {
      Image: "https://covers.openlibrary.org/b/id/15061573-L.jpg",
      page_count: 293,
    },
  };

  const defaultSubmissionConfig = {
    mode: "email",
    email: {
      to: "contact@ai-safety-resources.com",
    },
    appsScript: {
      endpointUrl: "",
      sheetUrl: "",
    },
    googleForm: {
      formViewUrl: "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/viewform",
      formResponseUrl: "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/formResponse",
      fields: {
        name: "entry.1000000001",
        author: "entry.1000000002",
        email: "entry.1000000006",
        link: "entry.1000000003",
        pages: "entry.1000000004",
        track: "entry.1000000005",
      },
    },
  };
  const rawSubmissionConfig = window.RWWC_SUGGESTION_SUBMISSION || {};
  const fallbackGoogleFormConfig = window.RWWC_GOOGLE_FORM || {};
  const sourceGoogleFormConfig = rawSubmissionConfig.googleForm || fallbackGoogleFormConfig;

  const submissionConfig = {
    mode: rawSubmissionConfig.mode || defaultSubmissionConfig.mode,
    email: {
      ...defaultSubmissionConfig.email,
      ...(rawSubmissionConfig.email || {}),
    },
    appsScript: {
      ...defaultSubmissionConfig.appsScript,
      ...(rawSubmissionConfig.appsScript || {}),
    },
    googleForm: {
      ...defaultSubmissionConfig.googleForm,
      ...sourceGoogleFormConfig,
      fields: {
        ...defaultSubmissionConfig.googleForm.fields,
        ...(sourceGoogleFormConfig.fields || {}),
      },
    },
  };

  const tabsMenu = document.querySelector(".gauntlet-tabs-menu");
  const libraryContent = document.querySelector(".library-content");
  const tabList = [...tabs];
  const tabKeys = new Set(tabList.map((tab) => tab.getAttribute("data-w-tab")));

  const prefersReducedMotion = () =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const motionSafeBehavior = () => (prefersReducedMotion() ? "auto" : "smooth");

  const syncTabA11yState = () => {
    tabList.forEach((tab) => {
      const isCurrent = tab.classList.contains("w--current");
      tab.setAttribute("aria-selected", isCurrent ? "true" : "false");
      tab.setAttribute("tabindex", isCurrent ? "0" : "-1");
    });
  };

  const activateTab = (targetKey, options = {}) => {
    if (!targetKey || !tabKeys.has(targetKey)) {
      return;
    }
    tabList.forEach((tab) => {
      tab.classList.toggle("w--current", tab.getAttribute("data-w-tab") === targetKey);
    });
    panes.forEach((pane) => {
      pane.classList.toggle("w--tab-active", pane.getAttribute("data-w-tab") === targetKey);
    });
    syncTabA11yState();

    if (options.updateHash) {
      try {
        window.history.replaceState(null, "", `#${targetKey}`);
      } catch (error) {
        // Deep-linking is a nice-to-have; ignore environments that block it.
      }
    }

    if (options.focusTab) {
      const activeTab = tabList.find((tab) => tab.getAttribute("data-w-tab") === targetKey);
      if (activeTab) {
        activeTab.focus();
      }
    }

    // When the user is deep in a long list, bring the top of the new category
    // into view so the switch is actually visible.
    if (
      options.scrollContent &&
      libraryContent &&
      libraryContent.getBoundingClientRect().top < 0
    ) {
      libraryContent.scrollIntoView({ behavior: motionSafeBehavior(), block: "start" });
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activateTab(tab.getAttribute("data-w-tab"), { updateHash: true, scrollContent: true });
    });
  });

  if (tabsMenu) {
    tabsMenu.addEventListener("keydown", (event) => {
      const navigationKeys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"];
      if (!navigationKeys.includes(event.key) || !tabList.length) {
        return;
      }
      const currentIndex = Math.max(
        tabList.findIndex((tab) => tab.classList.contains("w--current")),
        0
      );
      let nextIndex = currentIndex;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabList.length;
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabList.length) % tabList.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else {
        nextIndex = tabList.length - 1;
      }
      event.preventDefault();
      activateTab(tabList[nextIndex].getAttribute("data-w-tab"), {
        updateHash: true,
        focusTab: true,
      });
    });
  }

  const applyTabFromLocationHash = () => {
    let hashKey = "";
    try {
      hashKey = decodeURIComponent((window.location.hash || "").slice(1));
    } catch (error) {
      hashKey = "";
    }
    if (hashKey && tabKeys.has(hashKey)) {
      activateTab(hashKey, { updateHash: false });
    }
  };

  window.addEventListener("hashchange", () => {
    applyTabFromLocationHash();
    applyResourceHighlightFromHash();
  });
  applyTabFromLocationHash();
  syncTabA11yState();

  const escapeHtml = (value = "") =>
    value
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const buildErrorContext = (error) => {
    if (!error) {
      return null;
    }
    const context = {
      name: error.name || "Error",
      message: error.message || "Unknown error",
    };
    if (error.stack) {
      context.stack = error.stack;
    }
    return context;
  };

  const logResilienceWarning = (event, detail = {}, error = null) => {
    if (typeof console === "undefined" || typeof console.warn !== "function") {
      return;
    }
    console.warn(`[RWWC] ${event}`, {
      ...detail,
      error: buildErrorContext(error),
      timestamp: new Date().toISOString(),
    });
  };

  const logResilienceError = (event, detail = {}, error = null) => {
    if (typeof console === "undefined" || typeof console.error !== "function") {
      return;
    }
    console.error(`[RWWC] ${event}`, {
      ...detail,
      error: buildErrorContext(error),
      timestamp: new Date().toISOString(),
    });
  };

  const getSourceLabel = (link = "") => {
    const normalizedLink = link.toLowerCase();
    const found = sourceLabels.find(({ match }) => normalizedLink.includes(match));
    return found ? found.label : "Article";
  };

  const getDisplaySourceLabel = (entry = {}, link = "") => {
    const category = (entry.Category || "").toString();
    if (category === "websites") return "Website";
    if (category === "courses") return "Course";
    if (category === "tv") return "TV Series";
    if (category === "youtube") return "YouTube";
    if (category === "documentaries") return "Documentary";
    return getSourceLabel(link);
  };

  const normalizeTypeKey = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "_")
      .replaceAll(/^_+|_+$/g, "");

  const buildGoodreadsSearchUrl = (entry = {}) => {
    const query = [entry.Name || "", entry.Author || ""]
      .join(" ")
      .trim();
    if (!query) {
      return "https://www.goodreads.com/";
    }
    return `https://www.goodreads.com/search?q=${encodeURIComponent(query)}`;
  };

  const enrichEntryLinks = (entry) => {
    if (!entry) {
      return;
    }

    const rawLink = typeof entry.Link === "string" ? entry.Link.trim() : "";
    const hasGoodreadsInPrimaryLink = rawLink.toLowerCase().includes("goodreads.com");

    if (!entry.Goodreads || !entry.Goodreads.trim()) {
      entry.Goodreads = hasGoodreadsInPrimaryLink
        ? rawLink
        : buildGoodreadsSearchUrl(entry);
    }

    if (!rawLink && entry.Goodreads) {
      entry.Link = entry.Goodreads;
    }
  };

  const normalizePositiveInteger = (value) => {
    const numericValue = Number.parseInt(value, 10);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  };

  const isValidHttpUrl = (value = "") => {
    try {
      const url = new URL(value.toString().trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  };

  // Only links that point at a single playable video can be embedded inline;
  // channel/handle links (e.g. youtube.com/@RobertMilesAI) have no video id
  // and keep the normal "open externally" behavior.
  const getYoutubeVideoId = (link = "") => {
    try {
      const url = new URL(link.toString().trim());
      const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
      const isVideoId = (value) => /^[\w-]{6,}$/.test(value || "");
      if (host === "youtu.be") {
        const id = url.pathname.split("/").filter(Boolean)[0] || "";
        return isVideoId(id) ? id : "";
      }
      if (host === "youtube.com" || host === "music.youtube.com") {
        if (url.pathname === "/watch") {
          const id = url.searchParams.get("v") || "";
          return isVideoId(id) ? id : "";
        }
        const embedMatch = url.pathname.match(/^\/embed\/([\w-]{6,})/);
        if (embedMatch) {
          return embedMatch[1];
        }
        const shortsMatch = url.pathname.match(/^\/shorts\/([\w-]{6,})/);
        if (shortsMatch) {
          return shortsMatch[1];
        }
      }
    } catch (error) {
      // Not a parseable URL — no embed.
    }
    return "";
  };

  const normalizeStringInput = (value = "") =>
    value
      .toString()
      .replaceAll(/[\u0000-\u001F\u007F]+/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

  const trimToLimit = (value = "", limit = 255) =>
    normalizeStringInput(value).slice(0, limit);

  // Accept links pasted without a scheme (e.g. "goodreads.com/...", "www.imdb.com/...")
  // by defaulting to https://. Without this, the browser blocks scheme-less URLs.
  const normalizeLinkInput = (value = "") => {
    const trimmed = value.toString().trim();
    if (!trimmed) {
      return "";
    }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
      return `https://${trimmed.replace(/^\/+/, "")}`;
    }
    return trimmed;
  };

  const sanitizeSuggestionInput = (rawData) => {
    return {
      name: trimToLimit(rawData && rawData.name, suggestionFieldLimits.name),
      author: trimToLimit(rawData && rawData.author, suggestionFieldLimits.author),
      email: trimToLimit(rawData && rawData.email, suggestionFieldLimits.email).toLowerCase(),
      link: normalizeLinkInput(trimToLimit(rawData && rawData.link, suggestionFieldLimits.link)),
      track: validTrackKeys.has((rawData && rawData.track) || "")
        ? rawData.track
        : "non_fiction_books",
    };
  };

  const isValidEmail = (value = "") =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString().trim());

  const validateSuggestionInput = (data = {}) => {
    if (!data.name || !data.author || !data.link || !data.email) {
      return "Please fill title, author, link, and your email before submitting.";
    }
    if (!isValidHttpUrl(data.link)) {
      return "Please enter a valid link, e.g. https://example.com.";
    }
    if (!isValidEmail(data.email)) {
      return "Please provide a valid email address.";
    }
    return "";
  };

  const sanitizeImageUrl = (value = "") => {
    const normalized = value.toString().trim();
    if (!normalized) {
      return "";
    }
    try {
      const imageUrl = new URL(normalized);
      if (imageUrl.protocol === "http:") {
        imageUrl.protocol = "https:";
      }
      return imageUrl.protocol === "https:" ? imageUrl.toString() : "";
    } catch (error) {
      return "";
    }
  };

  const verifiedAuthorPortraits = {
    "holden karnofsky":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Holden_Karnofsky_0.jpg/330px-Holden_Karnofsky_0.jpg",
    "julia galef":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/20150126_Julia_Galef_2.JPG/330px-20150126_Julia_Galef_2.JPG",
    "sam altman":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sam_Altman_TechCrunch_SF_2019_Day_2_Oct_3_%28cropped%29.jpg/330px-Sam_Altman_TechCrunch_SF_2019_Day_2_Oct_3_%28cropped%29.jpg",
    "eliezer yudkowsky":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Eliezer_Yudkowsky%2C_Stanford_2006_%28square_crop%29.jpg/330px-Eliezer_Yudkowsky%2C_Stanford_2006_%28square_crop%29.jpg",
    "nick bostrom":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Prof_Nick_Bostrom_324-1.jpg/330px-Prof_Nick_Bostrom_324-1.jpg",
    "dario amodei":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Dario_Amodei_at_TechCrunch_Disrupt_2023_01.jpg/330px-Dario_Amodei_at_TechCrunch_Disrupt_2023_01.jpg",
  };

  const verifiedAuthorAliasToCanonicalName = {
    holden: "holden karnofsky",
    julia: "julia galef",
    jjulia: "julia galef",
    eliezer: "eliezer yudkowsky",
    bostrom: "nick bostrom",
    dario: "dario amodei",
  };

  const preferredOrganizationLogos = {
    anthropic:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Anthropic_logo.svg",
    openai:
      "https://commons.wikimedia.org/wiki/Special:FilePath/OpenAI_logo_2025.svg",
    deepmind:
      "https://commons.wikimedia.org/wiki/Special:FilePath/DeepMind_new_logo.svg",
    miri: "https://intelligence.org/favicon.ico",
    slatestarcodex: "https://slatestarcodex.com/favicon.ico",
  };

  const preferredOrganizationAliases = {
    anthropic: "anthropic",
    openai: "openai",
    deepmind: "deepmind",
    miri: "miri",
    "scott alexander": "slatestarcodex",
  };

  const preferredLinkLogoRules = [
    { match: "anthropic.com", key: "anthropic" },
    { match: "openai.com", key: "openai" },
    { match: "deepmind.google", key: "deepmind" },
    { match: "intelligence.org", key: "miri" },
    { match: "slatestarcodex.com", key: "slatestarcodex" },
  ];

  const normalizeAuthorLookupKey = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s-]+/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

  const getVerifiedAuthorPortraitFallback = (author = "") => {
    const normalizedAuthor = normalizeAuthorLookupKey(author);
    if (!normalizedAuthor) {
      return "";
    }

    const directPortrait = sanitizeImageUrl(verifiedAuthorPortraits[normalizedAuthor] || "");
    if (directPortrait) {
      return directPortrait;
    }

    const canonicalFromAlias = verifiedAuthorAliasToCanonicalName[normalizedAuthor];
    if (canonicalFromAlias && verifiedAuthorPortraits[canonicalFromAlias]) {
      return sanitizeImageUrl(verifiedAuthorPortraits[canonicalFromAlias]);
    }

    for (const [fullName, portraitUrl] of Object.entries(verifiedAuthorPortraits)) {
      if (normalizedAuthor.includes(fullName)) {
        return sanitizeImageUrl(portraitUrl);
      }
    }

    const candidates = normalizedAuthor
      .split(/,|;|\/|&|\band\b|\bet al\.?\b/gi)
      .map((part) => normalizeAuthorLookupKey(part))
      .filter(Boolean);

    for (const candidate of candidates) {
      if (verifiedAuthorPortraits[candidate]) {
        return sanitizeImageUrl(verifiedAuthorPortraits[candidate]);
      }
      const canonicalName = verifiedAuthorAliasToCanonicalName[candidate];
      if (canonicalName && verifiedAuthorPortraits[canonicalName]) {
        return sanitizeImageUrl(verifiedAuthorPortraits[canonicalName]);
      }
    }

    return "";
  };

  const getPreferredOrganizationLogoFallback = (entry = {}) => {
    const normalizedAuthor = normalizeAuthorLookupKey(entry.Author || "");
    if (normalizedAuthor) {
      for (const [alias, logoKey] of Object.entries(preferredOrganizationAliases)) {
        if (normalizedAuthor.includes(alias)) {
          return sanitizeImageUrl(preferredOrganizationLogos[logoKey] || "");
        }
      }
    }

    const normalizedLink = (entry.Link || "").toString().toLowerCase();
    if (normalizedLink) {
      const match = preferredLinkLogoRules.find(({ match: hostPart }) =>
        normalizedLink.includes(hostPart)
      );
      if (match) {
        return sanitizeImageUrl(preferredOrganizationLogos[match.key] || "");
      }
    }

    return "";
  };

  const createTimeoutError = (operationName, timeoutMs) => {
    const timeoutError = new Error(`${operationName} timed out after ${timeoutMs}ms`);
    timeoutError.name = "TimeoutError";
    return timeoutError;
  };

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000, operationName = "request") => {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw createTimeoutError(operationName, timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timerId);
    }
  };

  const normalizeYear = (value) => {
    const numericValue = Number.parseInt(value, 10);
    return Number.isFinite(numericValue) && numericValue >= 1800 && numericValue <= 2100
      ? numericValue
      : null;
  };

  const inferYearFromTitle = (title = "") => {
    const match = title.toString().match(/\b(18|19|20)\d{2}\b/);
    return match ? normalizeYear(match[0]) : null;
  };

  const inferYearFromArxivLink = (link = "") => {
    const modernMatch = link.match(/arxiv\.org\/(?:abs|pdf)\/(\d{2})(\d{2})\.\d+/i);
    if (modernMatch) {
      const year = 2000 + Number.parseInt(modernMatch[1], 10);
      return normalizeYear(year);
    }
    return null;
  };

  const inferYearFromLink = (link = "") => {
    const arxivYear = inferYearFromArxivLink(link);
    if (arxivYear) {
      return arxivYear;
    }

    const urlYearMatch = link.match(/(?:\/|=)(18|19|20)\d{2}(?:\/|[-_]|$)/);
    return urlYearMatch ? normalizeYear(urlYearMatch[0].replaceAll(/[^0-9]/g, "")) : null;
  };

  const getEntryYear = (entry) => {
    if (!entry) {
      return null;
    }

    const explicitYear = normalizeYear(entry.Year);
    if (explicitYear) {
      return explicitYear;
    }

    const knownYear = normalizeYear(knownPublicationYears[entry.Name]);
    if (knownYear) {
      return knownYear;
    }

    const fromTitle = inferYearFromTitle(entry.Name || "");
    if (fromTitle) {
      return fromTitle;
    }

    return inferYearFromLink((entry.Link || "").trim());
  };

  const getPageCountLabel = (entry) => {
    const pageCount = normalizePositiveInteger(entry && entry.page_count);
    return pageCount ? `${pageCount} pages` : "";
  };

  // Resource metadata pills (difficulty + time to consume). Mirrors
  // levelFor()/timeLabelFor() in scripts/lib/resources.mjs so the runtime cards
  // match the server-rendered cards; keep the two in sync.
  const validLevels = ["Beginner", "Intermediate", "Advanced"];
  const levelByTrack = {
    non_fiction_books: "Intermediate",
    fiction_books: "Beginner",
    academic_papers: "Advanced",
    courses: "Beginner",
    films: "Beginner",
    tv: "Beginner",
    documentaries: "Beginner",
    podcasts: "Beginner",
    websites: "Intermediate",
    youtube: "Beginner",
  };
  const getEntryLevel = (entry = {}) => {
    if (typeof entry.Level === "string" && validLevels.includes(entry.Level)) {
      return entry.Level;
    }
    return levelByTrack[getEntryBucketKey(entry)] || "";
  };
  const humanizeMinutes = (minutes, verb) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return "";
    if (minutes < 90) return `~${Math.round(minutes / 5) * 5 || 5} min ${verb}`;
    const hours = minutes / 60;
    const rounded = hours < 10 ? Math.round(hours * 2) / 2 : Math.round(hours);
    return `~${rounded} hr ${verb}`;
  };
  const getEntryTimeLabel = (entry = {}) => {
    const pages = normalizePositiveInteger(entry.page_count);
    if (pages) return humanizeMinutes(pages * 1.8, "read");
    const minutes = normalizePositiveInteger(entry.Minutes);
    if (minutes) {
      const track = getEntryBucketKey(entry);
      const verb = track === "podcasts" || track === "youtube" ? "listen" : "watch";
      return humanizeMinutes(minutes, verb);
    }
    return "";
  };

  const usedSummarySet = new Set();
  const summaryReasonRules = [
    {
      pattern: /(alignment|misalignment|goal|corrigibility|optimization|safety)/i,
      reason:
        "it clarifies concrete alignment failure modes and research directions that matter for catastrophic risk reduction",
    },
    {
      pattern: /(forecast|biological anchors|timeline|superforecast|century|speed limit)/i,
      reason:
        "it improves forecasting discipline for AGI timelines, strategic planning, and uncertainty management",
    },
    {
      pattern: /(interpretability|circuits|latent|probe|representation|superposition|mechanistic)/i,
      reason:
        "it gives practical techniques for inspecting model internals and validating whether systems are behaving safely",
    },
    {
      pattern: /(governance|policy|arms|war|international|windfall|control|openness)/i,
      reason:
        "it connects technical progress to governance decisions that shape global AI risk",
    },
    {
      pattern: /(rlhf|preference|constitutional|assistant|debate|instruct|gophercite)/i,
      reason:
        "it explains how feedback-based training can improve helpfulness while reducing harmful model behavior",
    },
    {
      pattern: /(scaling|gpt|chinchilla|emergent|ppo|lottery ticket|grokking|deep learning)/i,
      reason:
        "it highlights capability scaling dynamics that safety plans and evaluations must anticipate",
    },
  ];

  const getSummaryReasonForEntry = (entry = {}) => {
    const normalizedCategory = (entry.Category || "").toString();
    if (normalizedCategory === "books") {
      return "it stress-tests alignment and governance assumptions through concrete narratives about advanced AI systems";
    }

    const searchText = `${entry.Name || ""} ${entry.Author || ""}`.toLowerCase();
    const matchedRule = summaryReasonRules.find(({ pattern }) => pattern.test(searchText));
    if (matchedRule) {
      return matchedRule.reason;
    }

    const sourceLabel = getDisplaySourceLabel(entry, getEntryPrimaryLink(entry)).toLowerCase();
    if (sourceLabel === "book") {
      return "it builds durable mental models for forecasting, governance, and alignment under rapid capability growth";
    }
    if (sourceLabel === "arxiv" || sourceLabel === "pdf") {
      return "it defines technical assumptions and evaluation targets needed for robust AI safety research";
    }
    return "it improves practical judgment about how to reduce severe AI failure risk";
  };

  const buildFallbackSummary = (entry = {}) => {
    const title = trimToLimit(entry.Name || "This resource", 180);
    const author = trimToLimit(entry.Author || "", 120);
    const subject = author ? `${title} by ${author}` : title;
    return `${subject} is useful for AI safety because ${getSummaryReasonForEntry(entry)}.`;
  };

  const normalizeSummaryToOneSentence = (summary = "") => {
    const rawSummary = normalizeStringInput(summary);
    if (!rawSummary) {
      return "";
    }
    const firstSentenceMatch = rawSummary.match(/[^.!?]+[.!?]?/);
    let normalizedSummary = (firstSentenceMatch ? firstSentenceMatch[0] : rawSummary).trim();
    if (!/[.!?]$/.test(normalizedSummary)) {
      normalizedSummary += ".";
    }
    return normalizedSummary;
  };

  const getUniqueSummary = (entry = {}, baseSummary = "") => {
    const normalizedBase = normalizeSummaryToOneSentence(baseSummary, entry);
    const baseKey = normalizedBase.toLowerCase();
    if (normalizedBase && !usedSummarySet.has(baseKey)) {
      usedSummarySet.add(baseKey);
      return normalizedBase;
    }

    const fallbackSummary = normalizeSummaryToOneSentence(buildFallbackSummary(entry), entry);
    const fallbackKey = fallbackSummary.toLowerCase();
    if (fallbackSummary && !usedSummarySet.has(fallbackKey)) {
      usedSummarySet.add(fallbackKey);
      return fallbackSummary;
    }

    const title = trimToLimit(entry.Name || "This resource", 180);
    const author = trimToLimit(entry.Author || "the author", 120);
    const forcedSummary = normalizeSummaryToOneSentence(
      `${title} is useful for AI safety because it adds a distinct perspective from ${author} on reducing catastrophic AI risk.`,
      entry
    );
    usedSummarySet.add(forcedSummary.toLowerCase());
    return forcedSummary;
  };

  const getEntrySummary = (entry) => {
    if (!entry) {
      return "";
    }

    if (entry.__resolvedSummary) {
      return entry.__resolvedSummary;
    }

    const explicitSummary = (entry.Summary || entry.summary || "").toString().trim();
    const seededSummary = (seededEntrySummaries[entry.Name] || "").toString().trim();
    const candidateSummary = explicitSummary || seededSummary;
    if (!candidateSummary) {
      entry.__resolvedSummary = "";
      return "";
    }
    const normalizedSummary = normalizeSummaryToOneSentence(candidateSummary, entry);
    entry.__resolvedSummary = normalizedSummary;
    return normalizedSummary;
  };

  const applySeededMetadata = (entry) => {
    if (!entry || !entry.Name) {
      return;
    }

    const seed = seededEntryMetadata[entry.Name];
    if (!seed) {
      return;
    }

    if (seed.Image && (!entry.Image || !entry.Image.trim()) && !["films", "tv"].includes((entry.Category || "").toString())) {
      entry.Image = sanitizeImageUrl(seed.Image);
    }
    if (!normalizePositiveInteger(entry.page_count) && normalizePositiveInteger(seed.page_count)) {
      entry.page_count = seed.page_count;
    }
    if (!entry.Year && normalizeYear(seed.Year)) {
      entry.Year = normalizeYear(seed.Year);
    }
  };

  const getEntryPrimaryLink = (entry = {}) =>
    (entry.Link || entry.Goodreads || "").toString().trim();

  const prepareEntryForRender = (entry) => {
    if (!entry) {
      return;
    }
    enrichEntryLinks(entry);
    applySeededMetadata(entry);
    entry.__disableImage = titlesWithDisabledCovers.has(entry.Name || "");
    if (entry.__disableImage) {
      entry.Image = "";
    }
    const sourceType = getDisplaySourceLabel(entry, getEntryPrimaryLink(entry));
    const preferredPortrait = getVerifiedAuthorPortraitFallback(entry.Author || "");
    if (
      !entry.Image &&
      preferredPortrait &&
      sourceType !== "Book" &&
      !entry.__disableImage
    ) {
      // For essays/papers with known authors, prefer a reliable portrait over noisy metadata covers.
      entry.Image = preferredPortrait;
    }
    const preferredLogo = getPreferredOrganizationLogoFallback(entry);
    // Only use org logo when we don't have a verified author portrait (e.g. keep Yudkowsky photo for his intelligence.org essays).
    if (
      preferredLogo &&
      !entry.__disableImage &&
      !preferredPortrait
    ) {
      entry.Image = preferredLogo;
      entry.__coverIsLogo = true;
    } else {
      // Entries may mark their own pinned Image as a logo (`ImageIsLogo`) so
      // it gets the same padded logo treatment as org-logo fallbacks.
      entry.__coverIsLogo = Boolean(entry.ImageIsLogo && entry.Image);
    }
    entry.Image = sanitizeImageUrl(entry.Image || "");
    const inferredYear = getEntryYear(entry);
    if (!entry.Year && inferredYear) {
      entry.Year = inferredYear;
    }
  };

  const mergeEntryData = (primaryEntry, secondaryEntry) => {
    if (!primaryEntry || !secondaryEntry) {
      return primaryEntry;
    }

    const mergeableTextFields = ["Author", "Link", "Image", "Summary", "Category", "Goodreads"];
    mergeableTextFields.forEach((field) => {
      const primaryValue = (primaryEntry[field] || "").toString().trim();
      const secondaryValue = (secondaryEntry[field] || "").toString().trim();
      if (!primaryValue && secondaryValue) {
        primaryEntry[field] = secondaryEntry[field];
      }
    });

    if (!normalizePositiveInteger(primaryEntry.page_count) && normalizePositiveInteger(secondaryEntry.page_count)) {
      primaryEntry.page_count = secondaryEntry.page_count;
    }

    if (!getEntryYear(primaryEntry)) {
      const secondaryYear = getEntryYear(secondaryEntry);
      if (secondaryYear) {
        primaryEntry.Year = secondaryYear;
      }
    }

    return primaryEntry;
  };

  const normalizeTitleForLookup = (title = "") =>
    title
      .toString()
      .normalize("NFKD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replaceAll(/&/g, " and ")
      .replaceAll(/\((18|19|20)\d{2}\)/g, " ")
      .replaceAll(/[^a-z0-9]+/g, " ")
      .trim();

  const titleAliasLookup = {
    "the precipice chapter on ai": "the precipice",
    "general intelligence from ai services": "reframing superintelligence",
    "harry potter and the methods of rationality 1 of 6":
      "harry potter and the methods of rationality",
    "the dark forest 2 of three body problem": "the dark forest",
  };

  const getTitleLookupKey = (title = "") => {
    const normalized = normalizeTitleForLookup(title);
    return titleAliasLookup[normalized] || normalized;
  };

  const getEntryLookupKey = (entry = {}) => {
    const titleKey = getTitleLookupKey(entry.Name || "");
    const category = (entry.Category || "").toString().trim();
    return category ? `${titleKey}|${category}` : titleKey;
  };

  const isValidProgressStatus = (value = "") =>
    readingProgressOrder.includes(value.toString());

  const getReadingProgressLabel = (value = "") =>
    readingProgressLabels[value] || readingProgressLabels[""];

  const getProgressOptionsMarkup = (selectedValue = "") =>
    [
      `<option value=""${selectedValue ? "" : " selected"}>${readingProgressLabels[""]}</option>`,
      ...readingProgressOrder.map(
        (status) =>
          `<option value="${status}"${selectedValue === status ? " selected" : ""}>${readingProgressLabels[status]}</option>`
      ),
    ].join("");

  const getEntryTypeKey = (entry = {}) =>
    normalizeTypeKey(getDisplaySourceLabel(entry, getEntryPrimaryLink(entry)));

  const getEntryBucketKey = (entry = {}) => {
    let categoryKey = (entry.Category || "").toString();
    if (categoryKey === "books") {
      categoryKey = fictionBookTitles.has(entry.Name) ? "fiction_books" : "non_fiction_books";
    }
    return validTrackKeys.has(categoryKey) ? categoryKey : "";
  };

  const readingListSummaryElement = document.getElementById("reading-list-summary");
  const readingListPreviewElement = document.getElementById("reading-list-preview");
  let latestEntryLookup = new Map();
  let latestEntryCategoryLookup = new Map();
  let latestTrackTotals = new Map(
    Object.keys(trackLabels).map((trackKey) => [trackKey, 0])
  );

  const normalizeStoredTimestamp = (value = "") => {
    const timestamp = Date.parse(value.toString());
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
  };

  const normalizeReadingListRecord = (lookupKey, record = {}) => {
    const normalizedStatus = isValidProgressStatus(record.status) ? record.status : "";
    const normalizedYear = normalizeYear(record.year);
    const normalizedLink = isValidHttpUrl(record.link || "") ? record.link.toString().trim() : "";
    const normalizedCategory = validTrackKeys.has((record.category || "").toString())
      ? (record.category || "").toString()
      : "";
    return {
      lookupKey,
      name: trimToLimit(record.name || "", 180),
      author: trimToLimit(record.author || "", 140),
      link: normalizedLink,
      category: normalizedCategory,
      year: normalizedYear || null,
      status: normalizedStatus,
      savedAt: normalizeStoredTimestamp(record.savedAt),
      updatedAt: normalizeStoredTimestamp(record.updatedAt),
    };
  };

  const loadReadingListState = () => {
    try {
      const storedValue = window.localStorage.getItem(readingListStorageKey);
      if (!storedValue) {
        return {};
      }
      const parsed = JSON.parse(storedValue);
      if (!parsed || typeof parsed !== "object") {
        return {};
      }
      const normalizedEntries = {};
      Object.entries(parsed).forEach(([lookupKey, record]) => {
        if (!lookupKey) {
          return;
        }
        normalizedEntries[lookupKey] = normalizeReadingListRecord(lookupKey, record);
      });
      return normalizedEntries;
    } catch (error) {
      logResilienceWarning("reading_list_load_failed", {}, error);
      return {};
    }
  };

  let readingListState = loadReadingListState();

  const persistReadingListState = () => {
    try {
      window.localStorage.setItem(readingListStorageKey, JSON.stringify(readingListState));
    } catch (error) {
      logResilienceWarning("reading_list_persist_failed", {}, error);
    }
  };

  const getReadingListRecord = (lookupKey = "") =>
    (lookupKey && readingListState[lookupKey]) || null;

  const resolveTrackCategory = (value = "") =>
    validTrackKeys.has(value.toString()) ? value.toString() : "";

  const getResolvedRecordCategory = (record = {}) =>
    resolveTrackCategory(record.category || "") ||
    resolveTrackCategory(latestEntryCategoryLookup.get(record.lookupKey) || "");

  const createReadingListRecordFromEntry = (lookupKey, entry, status = "") => {
    const existing = getReadingListRecord(lookupKey);
    const nowIso = new Date().toISOString();
    const linkFromEntry = getEntryPrimaryLink(entry);
    const normalizedLink =
      isValidHttpUrl(linkFromEntry)
        ? linkFromEntry
        : existing && existing.link
          ? existing.link
          : "";
    const normalizedStatus = isValidProgressStatus(status)
      ? status
      : existing && isValidProgressStatus(existing.status)
        ? existing.status
        : "";

    return {
      lookupKey,
      name: trimToLimit(
        (entry && entry.Name) || (existing && existing.name) || "Untitled",
        180
      ),
      author: trimToLimit(
        (entry && entry.Author) || (existing && existing.author) || "",
        140
      ),
      link: normalizedLink,
      category:
        resolveTrackCategory(entry && entry.Category) ||
        resolveTrackCategory(latestEntryCategoryLookup.get(lookupKey) || "") ||
        resolveTrackCategory(existing && existing.category) ||
        "",
      year:
        (entry && getEntryYear(entry)) ||
        (existing && normalizeYear(existing.year)) ||
        null,
      status: normalizedStatus,
      savedAt: (existing && existing.savedAt) || nowIso,
      updatedAt: nowIso,
    };
  };

  const updateReadingListRecord = (lookupKey, entry, status = "") => {
    if (!lookupKey) {
      return;
    }
    const nextRecord = createReadingListRecordFromEntry(lookupKey, entry, status);
    readingListState = {
      ...readingListState,
      [lookupKey]: nextRecord,
    };
    persistReadingListState();
  };

  const removeReadingListRecord = (lookupKey) => {
    if (!lookupKey || !readingListState[lookupKey]) {
      return;
    }
    const nextState = { ...readingListState };
    delete nextState[lookupKey];
    readingListState = nextState;
    persistReadingListState();
  };

  // ── Star ratings ──────────────────────────────────────────────────────────
  // 1–5 star ratings per resource, stored locally like the reading list and
  // keyed by the same lookup key. Ratings feed the recommender: highly rated
  // resources pull similar picks in, low ratings push them away.
  const MAX_STAR_RATING = 5;

  const normalizeStarRating = (value) => {
    const rating = Math.round(Number(value));
    return Number.isFinite(rating) && rating >= 1 && rating <= MAX_STAR_RATING
      ? rating
      : 0;
  };

  const normalizeRatingRecord = (record) => {
    const rating = normalizeStarRating(
      record && typeof record === "object" ? record.rating : record
    );
    if (!rating) {
      return null;
    }
    return {
      rating,
      ratedAt: normalizeStoredTimestamp(
        record && typeof record === "object" ? record.ratedAt : ""
      ),
    };
  };

  const loadRatingsState = () => {
    try {
      const storedValue = window.localStorage.getItem(ratingsStorageKey);
      if (!storedValue) {
        return {};
      }
      const parsed = JSON.parse(storedValue);
      if (!parsed || typeof parsed !== "object") {
        return {};
      }
      const normalizedEntries = {};
      Object.entries(parsed).forEach(([lookupKey, record]) => {
        if (!lookupKey) {
          return;
        }
        const normalizedRecord = normalizeRatingRecord(record);
        if (normalizedRecord) {
          normalizedEntries[lookupKey] = normalizedRecord;
        }
      });
      return normalizedEntries;
    } catch (error) {
      logResilienceWarning("ratings_load_failed", {}, error);
      return {};
    }
  };

  let ratingsState = loadRatingsState();

  const persistRatingsState = () => {
    try {
      window.localStorage.setItem(ratingsStorageKey, JSON.stringify(ratingsState));
    } catch (error) {
      logResilienceWarning("ratings_persist_failed", {}, error);
    }
  };

  const getResourceRating = (lookupKey = "") =>
    lookupKey && ratingsState[lookupKey] ? ratingsState[lookupKey].rating : 0;

  const setResourceRating = (lookupKey, ratingValue) => {
    if (!lookupKey) {
      return;
    }
    const rating = normalizeStarRating(ratingValue);
    const nextState = { ...ratingsState };
    if (!rating) {
      delete nextState[lookupKey];
    } else {
      nextState[lookupKey] = { rating, ratedAt: new Date().toISOString() };
    }
    ratingsState = nextState;
    persistRatingsState();
  };

  const getStarRatingMarkup = (safeLookupKey, safeName, ratingValue = 0) => {
    const stars = [];
    for (let star = 1; star <= MAX_STAR_RATING; star += 1) {
      const plural = star === 1 ? "" : "s";
      stars.push(
        `<button type="button" class="star-button${ratingValue >= star ? " is-active" : ""}" data-rate-key="${safeLookupKey}" data-rate-value="${star}" aria-pressed="${ratingValue === star ? "true" : "false"}" aria-label="Rate ${safeName} ${star} star${plural}" title="${star} star${plural}">★</button>`
      );
    }
    return `<span class="star-rating" role="group" aria-label="Your rating for ${safeName}">${stars.join("")}</span>`;
  };

  const keyIsCanonical = (key = "") => {
    if (!key || typeof key !== "string" || !key.includes("|")) {
      return false;
    }
    const category = key.split("|").pop();
    return validTrackKeys.has((category || "").trim());
  };

  const normalizeReadingListKeys = (entryLookup) => {
    if (!entryLookup || typeof entryLookup.forEach !== "function") {
      return;
    }
    const keys = Object.keys(readingListState);
    const toNormalize = keys.filter((k) => !keyIsCanonical(k));
    if (!toNormalize.length) {
      return;
    }
    let nextState = { ...readingListState };
    let changed = false;
    for (const oldKey of toNormalize) {
      const record = nextState[oldKey];
      if (!record) {
        continue;
      }
      const titlePart = oldKey.includes("|")
        ? oldKey.replace(/\|[^|]*$/, "").trim()
        : oldKey.trim();
      const normalizedTitle = getTitleLookupKey(titlePart);
      if (!normalizedTitle) {
        continue;
      }
      const candidates = [];
      entryLookup.forEach((entry, canonicalKey) => {
        if (!entry || !canonicalKey || !keyIsCanonical(canonicalKey)) {
          return;
        }
        if (getTitleLookupKey(entry.Name || "") !== normalizedTitle) {
          return;
        }
        candidates.push({ canonicalKey, entry });
      });
      if (candidates.length === 0) {
        continue;
      }
      let targetKey = null;
      if (candidates.length === 1) {
        targetKey = candidates[0].canonicalKey;
      } else {
        const recordLink = (record.link || "").toString().trim();
        if (recordLink) {
          const byLink = candidates.find(
            (c) => getEntryPrimaryLink(c.entry) === recordLink
          );
          if (byLink) {
            targetKey = byLink.canonicalKey;
          }
        }
        if (!targetKey && (oldKey.endsWith("|books") || !oldKey.includes("|"))) {
          const bookEntry = candidates.find(
            (c) =>
              c.canonicalKey.endsWith("|fiction_books") ||
              c.canonicalKey.endsWith("|non_fiction_books")
          );
          if (bookEntry) {
            targetKey = bookEntry.canonicalKey;
          }
        }
        if (!targetKey) {
          targetKey = candidates[0].canonicalKey;
        }
      }
      if (targetKey && targetKey !== oldKey) {
        nextState = { ...nextState, [targetKey]: { ...record, lookupKey: targetKey } };
        delete nextState[oldKey];
        changed = true;
      }
    }
    if (changed) {
      readingListState = nextState;
      persistReadingListState();
    }
  };

  const getSortedReadingListRecords = () =>
    Object.values(readingListState).sort(
      (left, right) => Date.parse(right.updatedAt || "") - Date.parse(left.updatedAt || "")
    );

  const renderReadingDashboard = () => {
    if (!readingListSummaryElement || !readingListPreviewElement) {
      return;
    }
    const priorSectionOpenState = {};
    readingListPreviewElement
      .querySelectorAll("details[data-reading-track]")
      .forEach((sectionElement) => {
        const trackKey = (sectionElement.getAttribute("data-reading-track") || "").trim();
        if (trackKey) {
          priorSectionOpenState[trackKey] = Boolean(sectionElement.open);
        }
      });

    const records = getSortedReadingListRecords();
    const totalSaved = records.length;
    const totalFinished = records.filter((record) => record.status === "finished").length;
    const completionPercent = totalSaved
      ? Math.round((totalFinished / totalSaved) * 100)
      : 0;
    readingListSummaryElement.textContent = totalSaved
      ? `${totalSaved} saved • ${totalFinished} finished (${completionPercent}% complete)`
      : "Save resources to track progress.";

    if (!records.length) {
      readingListPreviewElement.innerHTML = `
        <p class="reading-list-empty">
          No saved resources yet. Use the Save button on any resource card.
        </p>
      `;
      renderRecommendations();
      return;
    }

    const renderReadingItemMarkup = (record) => {
      const safeName = escapeHtml(record.name || "Untitled");
      const safeAuthor = escapeHtml(record.author || "Unknown author");
      const safeLink = escapeHtml(record.link || "#");
      const safeLookupKey = escapeHtml(record.lookupKey || "");
      const progressMarkup = getProgressOptionsMarkup(record.status || "");
      return `
        <li class="reading-list-item">
          <div class="reading-list-item-main">
            <a href="${safeLink}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="reading-list-item-link">${safeName}</a>
            <span class="reading-list-item-meta">${safeAuthor}</span>
          </div>
          <div class="reading-list-item-actions">
            <select class="reading-list-status-select" data-dashboard-progress-select="${safeLookupKey}" aria-label="Progress for ${safeName}">
              ${progressMarkup}
            </select>
            <button type="button" class="reading-list-remove" data-reading-remove-key="${safeLookupKey}">
              Remove
            </button>
          </div>
        </li>
      `;
    };

    const sectionsMarkup = Object.entries(trackLabels)
      .map(([trackKey, trackLabel]) => {
        const safeTrackKey = escapeHtml(trackKey);
        const safeTrackLabel = escapeHtml(trackLabel);
        const trackTotal = normalizePositiveInteger(latestTrackTotals.get(trackKey) || 0) || 0;
        const trackRecords = records.filter(
          (record) => getResolvedRecordCategory(record) === trackKey
        );
        const trackFinished = trackRecords.filter((record) => record.status === "finished").length;
        const trackPercent = trackTotal
          ? Math.round((trackFinished / trackTotal) * 100)
          : 0;
        const isSectionOpen = Object.prototype.hasOwnProperty.call(priorSectionOpenState, trackKey)
          ? priorSectionOpenState[trackKey]
          : trackRecords.length > 0;

        const sectionContentMarkup = trackRecords.length
          ? `
            <ul class="reading-list-items">
              ${trackRecords.map(renderReadingItemMarkup).join("")}
            </ul>
          `
          : `<p class="reading-section-empty">No saved resources in this track yet.</p>`;

        return `
          <details class="reading-section" data-reading-track="${safeTrackKey}"${isSectionOpen ? " open" : ""}>
            <summary class="reading-section-summary">
              <span class="reading-section-name">${safeTrackLabel}</span>
              <span class="reading-section-count">${trackFinished}/${trackTotal}</span>
            </summary>
            <div class="reading-section-progress">
              <div class="track-progress-bar">
                <span class="track-progress-fill" style="width:${trackPercent}%"></span>
              </div>
            </div>
            ${sectionContentMarkup}
          </details>
        `;
      })
      .join("");

    // Records whose category cannot be resolved to a known track (e.g. a
    // resource that was later removed or renamed in the dataset) would
    // otherwise be counted in the summary but never rendered in any section,
    // leaving them invisible and impossible to remove. Surface them in a
    // dedicated "Other" section so every saved record stays actionable.
    const otherRecords = records.filter(
      (record) => !validTrackKeys.has(getResolvedRecordCategory(record))
    );
    const otherFinished = otherRecords.filter((record) => record.status === "finished").length;
    const otherSectionMarkup = otherRecords.length
      ? `
        <details class="reading-section" data-reading-track="__other"${
          Object.prototype.hasOwnProperty.call(priorSectionOpenState, "__other")
            ? priorSectionOpenState["__other"]
              ? " open"
              : ""
            : " open"
        }>
          <summary class="reading-section-summary">
            <span class="reading-section-name">Other</span>
            <span class="reading-section-count">${otherFinished}/${otherRecords.length}</span>
          </summary>
          <ul class="reading-list-items">
            ${otherRecords.map(renderReadingItemMarkup).join("")}
          </ul>
        </details>
      `
      : "";

    readingListPreviewElement.innerHTML = sectionsMarkup + otherSectionMarkup;
    renderRecommendations();
  };

  const fallbackCopyTextToClipboard = (text, onDone) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      onDone();
    } catch (error) {
      logResilienceWarning("copy_link_fallback_failed", {}, error);
    }
  };

  const copyResourceLink = (buttonElement, lookupKey) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#r-${encodeURIComponent(
      lookupKey
    )}`;
    const showCopiedFeedback = () => {
      if (!buttonElement) {
        return;
      }
      const originalLabel = buttonElement.textContent;
      buttonElement.textContent = "Copied!";
      buttonElement.classList.add("is-copied");
      window.setTimeout(() => {
        buttonElement.textContent = originalLabel;
        buttonElement.classList.remove("is-copied");
      }, 1600);
    };
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard
        .writeText(shareUrl)
        .then(showCopiedFeedback)
        .catch(() => fallbackCopyTextToClipboard(shareUrl, showCopiedFeedback));
    } else {
      fallbackCopyTextToClipboard(shareUrl, showCopiedFeedback);
    }
  };

  // Scrolls to and briefly spotlights a rendered card. Used by both the
  // "Surprise me" button and incoming `#r-<lookupKey>` share links. Switches
  // to the entry's tab first (its card exists in the DOM even off-screen, but
  // the owning tab pane must be visible for scrollIntoView to do anything).
  const highlightCardByLookupKey = (lookupKey) => {
    if (!lookupKey) {
      return;
    }
    const trackKey = latestEntryCategoryLookup.get(lookupKey);
    if (trackKey) {
      activateTab(trackKey, { updateHash: false });
    }
    const card = [...document.querySelectorAll(".resource-card[data-lookup-key]")].find(
      (element) => element.getAttribute("data-lookup-key") === lookupKey
    );
    if (!card) {
      return;
    }
    card.scrollIntoView({ behavior: motionSafeBehavior(), block: "center" });
    card.classList.add("is-spotlighted");
    window.setTimeout(() => card.classList.remove("is-spotlighted"), 2200);
  };

  const parseResourceHashKey = () => {
    const rawHash = (window.location.hash || "").slice(1);
    if (!rawHash.startsWith("r-")) {
      return "";
    }
    try {
      return decodeURIComponent(rawHash.slice(2));
    } catch (error) {
      return "";
    }
  };

  const applyResourceHighlightFromHash = () => {
    const lookupKey = parseResourceHashKey();
    if (lookupKey) {
      highlightCardByLookupKey(lookupKey);
    }
  };

  const disabledTitleKeys = new Set(
    resourceGuardrails.disabledTitles
      .map((title) => getTitleLookupKey(title))
      .filter(Boolean)
  );
  const disabledLinks = new Set(
    resourceGuardrails.disabledLinks
      .map((link) => link.toString().trim())
      .filter(Boolean)
  );

  const isEntryDisabledByGuardrails = (entry, lookupKey = "") => {
    if (!entry) {
      return true;
    }
    const titleOnlyKey = lookupKey && lookupKey.includes("|") ? lookupKey.replace(/\|[^|]*$/, "") : lookupKey;
    if (titleOnlyKey && disabledTitleKeys.has(titleOnlyKey)) {
      return true;
    }
    const entryLink = getEntryPrimaryLink(entry);
    if (!entryLink || !isValidHttpUrl(entryLink)) {
      return true;
    }
    return disabledLinks.has(entryLink);
  };

  const isLikelySearchLink = (link = "") => {
    const normalizedLink = link.toLowerCase();
    return (
      normalizedLink.includes("google.com/search") ||
      normalizedLink.includes("goodreads.com/search")
    );
  };

  const getEntryQualityScore = (entry = {}) => {
    const hasSummary = Boolean((entry.Summary || "").trim());
    const hasImage = Boolean((entry.Image || "").trim());
    const hasPages = Boolean(normalizePositiveInteger(entry.page_count));
    const hasYear = Boolean(getEntryYear(entry));
    const hasCategory = Boolean((entry.Category || "").trim());
    const link = (entry.Link || "").trim();
    const hasStrongLink = Boolean(link) && !isLikelySearchLink(link);

    return (
      (hasSummary ? 8 : 0) +
      (hasImage ? 4 : 0) +
      (hasPages ? 3 : 0) +
      (hasYear ? 2 : 0) +
      (hasStrongLink ? 2 : 0) +
      (hasCategory ? 1 : 0)
    );
  };

  const formatRank = (index) => (index + 1 < 10 ? `0${index + 1}` : `${index + 1}`);

  const getFallbackInitial = (title = "") => {
    const trimmed = title.trim();
    return trimmed.length ? trimmed[0].toUpperCase() : "R";
  };

  // A deterministic, good-looking placeholder used whenever a cover/poster
  // can't be loaded: up to two initials on a hue derived from the title.
  const coverInitialStopWords = new Set([
    "a", "an", "the", "of", "and", "or", "to", "for", "is", "in", "on",
  ]);

  const getCoverInitials = (title = "") => {
    const words = title
      .toString()
      .replaceAll(/[^a-zA-Z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter((word) => word && !coverInitialStopWords.has(word.toLowerCase()));
    const source = words.length ? words : title.toString().trim().split(/\s+/).filter(Boolean);
    const initials = source.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
    return initials || getFallbackInitial(title);
  };

  const getCoverHue = (title = "") => {
    let hash = 0;
    const text = title.toString();
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) % 360;
    }
    return Math.abs(hash);
  };

  const buildCoverPlaceholderMarkup = (title = "") =>
    `<span class="cover-fallback" style="--cover-hue:${getCoverHue(title)}"><span class="cover-fallback-initials">${escapeHtml(
      getCoverInitials(title)
    )}</span></span>`;

  const toSafeDomId = (value = "") =>
    value.toString().replaceAll(/[^a-zA-Z0-9_-]/g, "-");

  const wireCoverFallback = (coverElementId, fallbackTitle) => {
    const coverContainer = document.getElementById(coverElementId);
    if (!coverContainer) {
      return;
    }
    const imageElement = coverContainer.querySelector("img.book-image");
    if (!imageElement) {
      return;
    }
    imageElement.addEventListener(
      "error",
      () => {
        coverContainer.innerHTML = buildCoverPlaceholderMarkup(fallbackTitle);
      },
      { once: true }
    );
  };

  // Loose title key for comparing our entry names against catalog titles:
  // lowercase, strip accents/punctuation, drop a leading article.
  const normalizeCatalogTitle = (value = "") =>
    value
      .toString()
      .normalize("NFKD")
      .replaceAll(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replaceAll(/&/g, " and ")
      .replaceAll(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/^(the|a|an) /, "");

  const catalogTitleMatchesEntry = (catalogTitle = "", entryName = "") => {
    const catalogKey = normalizeCatalogTitle(catalogTitle);
    const entryKey = normalizeCatalogTitle(entryName);
    if (!catalogKey || !entryKey) {
      return false;
    }
    // Exact match, or one is the other plus a subtitle (entry names often drop
    // subtitles, catalogs often include them).
    return (
      catalogKey === entryKey ||
      catalogKey.startsWith(`${entryKey} `) ||
      entryKey.startsWith(`${catalogKey} `)
    );
  };

  const catalogAuthorMatchesEntry = (catalogAuthors, entryAuthor = "") => {
    const entryKey = normalizeCatalogTitle(entryAuthor);
    if (!entryKey) {
      return true;
    }
    const names = Array.isArray(catalogAuthors) ? catalogAuthors : [catalogAuthors];
    const entryLastNames = entryKey.split(" ").filter((part) => part.length > 2);
    return names.some((name) => {
      const nameKey = normalizeCatalogTitle(name || "");
      return nameKey && entryLastNames.some((part) => nameKey.includes(part));
    });
  };

  // Only accept a fuzzy search result whose title AND author actually match the
  // entry — a same-titled book by someone else must never supply the cover.
  const extractOpenLibraryMetadata = (payload, entry = {}) => {
    const docs = payload && Array.isArray(payload.docs) ? payload.docs : [];
    const match = docs.find(
      (doc) =>
        doc &&
        (doc.cover_i || doc.number_of_pages_median || doc.first_publish_year) &&
        catalogTitleMatchesEntry(doc.title || "", entry.Name || "") &&
        catalogAuthorMatchesEntry(doc.author_name || [], entry.Author || "")
    );
    if (!match) {
      return { coverUrl: "", pageCount: null, year: null };
    }

    return {
      coverUrl: match.cover_i ? `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg` : "",
      pageCount: normalizePositiveInteger(match.number_of_pages_median),
      year: normalizeYear(match.first_publish_year),
    };
  };

  // Resolve a book's cover from a pinned Open Library id (`OpenLibraryWork`
  // field, a work "OL...W" or edition "OL...M" id). Deterministic: the pinned
  // record's own cover or nothing, never a search guess.
  const queryOpenLibraryPinnedMetadata = async (entry) => {
    const pinnedId = (entry.OpenLibraryWork || "").toString().trim();
    const idMatch = pinnedId.match(/^OL\d+([WM])$/);
    if (!idMatch) {
      return { coverUrl: "", pageCount: null, year: null };
    }
    const isWork = idMatch[1] === "W";
    const recordUrl = `https://openlibrary.org/${isWork ? "works" : "books"}/${pinnedId}.json`;
    let response;
    try {
      response = await fetchWithTimeout(
        recordUrl,
        { headers: { Accept: "application/json" } },
        metadataLookupTimeoutMs,
        "OpenLibrary pinned record lookup"
      );
    } catch (error) {
      logResilienceWarning("openlibrary_pinned_lookup_failed", { pinnedId }, error);
      return { coverUrl: "", pageCount: null, year: null };
    }
    if (!response.ok) {
      logResilienceWarning("openlibrary_pinned_unexpected_status", {
        pinnedId,
        status: response.status,
      });
      return { coverUrl: "", pageCount: null, year: null };
    }
    try {
      const payload = await response.json();
      const covers = Array.isArray(payload && payload.covers) ? payload.covers : [];
      const coverId = covers.find((id) => normalizePositiveInteger(id));
      const publishYearMatch = ((payload && payload.publish_date) || "").match(/\b(18|19|20)\d{2}\b/);
      return {
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
        pageCount: normalizePositiveInteger(payload && payload.number_of_pages),
        year: publishYearMatch ? normalizeYear(publishYearMatch[0]) : null,
      };
    } catch (error) {
      logResilienceWarning("openlibrary_pinned_parse_failed", { pinnedId }, error);
      return { coverUrl: "", pageCount: null, year: null };
    }
  };

  const queryOpenLibraryMetadata = async (entry) => {
    const title = (entry.Name || "").trim();
    const author = (entry.Author || "").trim();
    if (!title) {
      return { coverUrl: "", pageCount: null, year: null };
    }

    const queryUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ""}&limit=5`;
    let response;
    try {
      response = await fetchWithTimeout(
        queryUrl,
        {},
        metadataLookupTimeoutMs,
        "OpenLibrary metadata lookup"
      );
    } catch (error) {
      logResilienceWarning(
        "openlibrary_lookup_failed",
        { title, author, queryUrl },
        error
      );
      return { coverUrl: "", pageCount: null, year: null };
    }
    if (!response.ok) {
      logResilienceWarning("openlibrary_lookup_unexpected_status", {
        title,
        author,
        status: response.status,
      });
      return { coverUrl: "", pageCount: null, year: null };
    }

    try {
      const payload = await response.json();
      return extractOpenLibraryMetadata(payload, entry);
    } catch (error) {
      logResilienceWarning(
        "openlibrary_payload_parse_failed",
        { title, author },
        error
      );
      return { coverUrl: "", pageCount: null, year: null };
    }
  };

  const queryGoogleBooksMetadata = async (entry) => {
    const title = (entry.Name || "").trim();
    const author = (entry.Author || "").trim();
    if (!title) {
      return { coverUrl: "", pageCount: null, year: null };
    }

    const queryParts = [`intitle:${title}`];
    if (author) {
      queryParts.push(`inauthor:${author}`);
    }
    const queryUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParts.join(" "))}&maxResults=3`;
    let response;
    try {
      response = await fetchWithTimeout(
        queryUrl,
        {},
        metadataLookupTimeoutMs,
        "Google Books metadata lookup"
      );
    } catch (error) {
      logResilienceWarning(
        "google_books_lookup_failed",
        { title, author, queryUrl },
        error
      );
      return { coverUrl: "", pageCount: null, year: null };
    }
    if (!response.ok) {
      logResilienceWarning("google_books_lookup_unexpected_status", {
        title,
        author,
        status: response.status,
      });
      return { coverUrl: "", pageCount: null, year: null };
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      logResilienceWarning(
        "google_books_payload_parse_failed",
        { title, author },
        error
      );
      return { coverUrl: "", pageCount: null, year: null };
    }
    const items = payload && Array.isArray(payload.items) ? payload.items : [];
    // Same rule as Open Library: a volume only qualifies when its title and
    // author match the entry, so a same-titled book never supplies the cover.
    const bestVolumeInfo = items
      .map((item) => (item ? item.volumeInfo : null))
      .filter(Boolean)
      .filter(
        (volumeInfo) =>
          catalogTitleMatchesEntry(volumeInfo.title || "", entry.Name || "") &&
          catalogAuthorMatchesEntry(volumeInfo.authors || [], entry.Author || "")
      )
      .sort((left, right) => {
        const score = (volumeInfo) =>
          (volumeInfo.imageLinks ? 2 : 0) +
          (normalizePositiveInteger(volumeInfo.pageCount) ? 2 : 0) +
          (volumeInfo.publishedDate ? 1 : 0);
        return score(right) - score(left);
      })[0];

    if (!bestVolumeInfo) {
      return { coverUrl: "", pageCount: null, year: null };
    }

    const links = bestVolumeInfo.imageLinks || {};
    const coverUrl = sanitizeImageUrl(links.thumbnail || links.smallThumbnail || "");
    const publishedDate = bestVolumeInfo.publishedDate || "";
    const publishedYearMatch = publishedDate.match(/\b(18|19|20)\d{2}\b/);

    return {
      coverUrl,
      pageCount: normalizePositiveInteger(bestVolumeInfo.pageCount),
      year: publishedYearMatch ? normalizeYear(publishedYearMatch[0]) : null,
    };
  };

  const extractWikipediaThumbnail = (payload) => {
    const pages = payload && payload.query && payload.query.pages;
    if (!pages || typeof pages !== "object") {
      return "";
    }
    const match = Object.values(pages).find(
      (page) => page && page.thumbnail && page.thumbnail.source
    );
    return match ? match.thumbnail.source : "";
  };

  // Resolve an entry's image from a pinned Wikipedia article (`Wikipedia`
  // field): the article's lead image (film poster, org logo, or author
  // portrait). Pins are looked up directly by exact title — deterministic, so
  // this returns the correct image or nothing, never a mismatched one. The old
  // search-generator fallback was removed on purpose: fuzzy title search too
  // often returns a same-titled but different work, and a wrong image is worse
  // than no image.
  const queryPinnedWikipediaImage = async (entry) => {
    const pinnedArticle = (entry.Wikipedia || "").toString().trim();
    if (!pinnedArticle) {
      return "";
    }
    const queryUrl =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1" +
      "&prop=pageimages&piprop=thumbnail&pithumbsize=500" +
      `&titles=${encodeURIComponent(pinnedArticle)}`;

    let response;
    try {
      response = await fetchWithTimeout(
        queryUrl,
        { headers: { Accept: "application/json" } },
        metadataLookupTimeoutMs,
        "Wikipedia pinned image lookup"
      );
    } catch (error) {
      logResilienceWarning("wikipedia_poster_lookup_failed", { title: pinnedArticle }, error);
      return "";
    }
    if (!response.ok) {
      logResilienceWarning("wikipedia_poster_unexpected_status", {
        title: pinnedArticle,
        status: response.status,
      });
      return "";
    }
    try {
      const payload = await response.json();
      return sanitizeImageUrl(extractWikipediaThumbnail(payload));
    } catch (error) {
      logResilienceWarning("wikipedia_poster_parse_failed", { title: pinnedArticle }, error);
      return "";
    }
  };

  const fetchEntryMetadata = async (entry) => {
    const key = `${(entry.Name || "").trim().toLowerCase()}::${(entry.Author || "").trim().toLowerCase()}`;
    if (!key || key === "::") {
      return { coverUrl: "", pageCount: null, year: null };
    }

    if (entryMetadataCache.has(key)) {
      return entryMetadataCache.get(key);
    }

    if (pendingMetadataLookups.has(key)) {
      return pendingMetadataLookups.get(key);
    }

    const pendingLookup = (async () => {
      const metadata = { coverUrl: "", pageCount: null, year: null };
      const lookupCategory = (entry.Category || "").toString();
      const hasWikipediaPin = Boolean((entry.Wikipedia || "").toString().trim());
      const isFilmCategory =
        lookupCategory === "films" ||
        lookupCategory === "tv" ||
        lookupCategory === "documentaries";
      // A pinned Wikipedia article resolves the image for any category:
      // posters for film/TV/documentary pins, logos/portraits for org, site,
      // and author pins on papers, websites, courses, and podcasts.
      if (isFilmCategory || hasWikipediaPin) {
        try {
          metadata.coverUrl = sanitizeImageUrl(await queryPinnedWikipediaImage(entry));
        } catch (error) {
          logResilienceWarning("film_poster_lookup_failed", { name: entry && entry.Name }, error);
        }
        entryMetadataCache.set(key, metadata);
        pendingMetadataLookups.delete(key);
        return metadata;
      }
      try {
        const pinnedOpenLibraryMetadata = await queryOpenLibraryPinnedMetadata(entry);
        metadata.coverUrl = sanitizeImageUrl(pinnedOpenLibraryMetadata.coverUrl || "");
        metadata.pageCount = normalizePositiveInteger(pinnedOpenLibraryMetadata.pageCount);
        metadata.year = normalizeYear(pinnedOpenLibraryMetadata.year);

        if (!metadata.coverUrl || !metadata.pageCount || !metadata.year) {
          const openLibraryMetadata = await queryOpenLibraryMetadata(entry);
          if (!metadata.coverUrl) {
            metadata.coverUrl = sanitizeImageUrl(openLibraryMetadata.coverUrl || "");
          }
          if (!metadata.pageCount) {
            metadata.pageCount = normalizePositiveInteger(openLibraryMetadata.pageCount);
          }
          if (!metadata.year) {
            metadata.year = normalizeYear(openLibraryMetadata.year);
          }
        }

        if (!metadata.coverUrl || !metadata.pageCount || !metadata.year) {
          const googleBooksMetadata = await queryGoogleBooksMetadata(entry);
          if (!metadata.coverUrl) {
            metadata.coverUrl = sanitizeImageUrl(googleBooksMetadata.coverUrl || "");
          }
          if (!metadata.pageCount) {
            metadata.pageCount = normalizePositiveInteger(googleBooksMetadata.pageCount);
          }
          if (!metadata.year) {
            metadata.year = normalizeYear(googleBooksMetadata.year);
          }
        }

        if (!metadata.coverUrl && entry.Author) {
          metadata.coverUrl = getVerifiedAuthorPortraitFallback(entry.Author);
        }

      } catch (error) {
        logResilienceWarning(
          "metadata_lookup_failed",
          { name: entry && entry.Name, author: entry && entry.Author },
          error
        );
      }

      entryMetadataCache.set(key, metadata);
      pendingMetadataLookups.delete(key);
      return metadata;
    })();

    pendingMetadataLookups.set(key, pendingLookup);
    return pendingLookup;
  };

  const hydrateEntryMetadata = async (entry, ids) => {
    try {
      if (!entry) {
        return;
      }

      if (entry.Image && normalizePositiveInteger(entry.page_count) && getEntryYear(entry)) {
        return;
      }

      const metadata = await fetchEntryMetadata(entry);

      const safeCoverUrl = sanitizeImageUrl(metadata.coverUrl);

      if (!entry.Image && safeCoverUrl && !entry.__disableImage) {
        entry.Image = safeCoverUrl;
        const coverElement = document.getElementById(ids.coverElementId);
        if (coverElement) {
          const safeAlt = escapeHtml(`${entry.Name || "Book"} cover`);
          coverElement.innerHTML = `<img class="book-image" src="${escapeHtml(safeCoverUrl)}" loading="lazy" alt="${safeAlt}" />`;
        }
        wireCoverFallback(ids.coverElementId, entry.Name || "Book");
      }

      if (!normalizePositiveInteger(entry.page_count) && metadata.pageCount) {
        entry.page_count = metadata.pageCount;
        const pageElement = document.getElementById(ids.pageElementId);
        if (pageElement) {
          pageElement.textContent = `${metadata.pageCount} pages`;
          pageElement.classList.remove("is-hidden");
        }
      }

      if (!getEntryYear(entry) && metadata.year) {
        entry.Year = metadata.year;
        const yearElement = document.getElementById(ids.yearElementId);
        if (yearElement) {
          yearElement.textContent = `${metadata.year}`;
          yearElement.classList.remove("is-hidden");
        }
      }
    } catch (error) {
      // Keep rendering resilient even when metadata providers fail.
      logResilienceWarning(
        "metadata_hydration_skipped_for_entry",
        { name: entry && entry.Name },
        error
      );
    }
  };

  const metadataHydrationQueue = [];
  const queuedMetadataHydrationKeys = new Set();
  let activeMetadataHydrations = 0;

  const getMetadataHydrationTaskKey = (ids = {}) =>
    `${ids.coverElementId || ""}|${ids.pageElementId || ""}|${ids.yearElementId || ""}`;

  const drainMetadataHydrationQueue = () => {
    while (
      activeMetadataHydrations < metadataHydrationConcurrency &&
      metadataHydrationQueue.length
    ) {
      const nextTask = metadataHydrationQueue.shift();
      if (!nextTask) {
        continue;
      }
      activeMetadataHydrations += 1;
      void hydrateEntryMetadata(nextTask.entry, nextTask.ids)
        .catch((error) => {
          logResilienceWarning(
            "metadata_hydration_queue_task_failed",
            { name: nextTask.entry && nextTask.entry.Name },
            error
          );
        })
        .finally(() => {
          activeMetadataHydrations = Math.max(0, activeMetadataHydrations - 1);
          queuedMetadataHydrationKeys.delete(nextTask.taskKey);
          drainMetadataHydrationQueue();
        });
    }
  };

  const queueMetadataHydration = (entry, ids) => {
    if (!ids || !ids.coverElementId || !ids.pageElementId || !ids.yearElementId) {
      return;
    }
    const taskKey = getMetadataHydrationTaskKey(ids);
    if (queuedMetadataHydrationKeys.has(taskKey)) {
      return;
    }
    queuedMetadataHydrationKeys.add(taskKey);
    metadataHydrationQueue.push({ entry, ids, taskKey });
    drainMetadataHydrationQueue();
  };

  const renderSuggestionCard = (parent, index) => {
    parent.insertAdjacentHTML(
      "beforeend",
      `
      <a href="#suggestion-form-section" class="hypothesis book suggestion-card responsive w-inline-block">
        <span class="book-rank">${formatRank(index)}</span>
        <span class="book-cover"><span class="cover-fallback">+</span></span>
        <div class="book-main">
          <h4 class="idea-header book">Suggest a title for this slot</h4>
          <span class="author">Use the quick form above</span>
          <div class="book-meta">
            <span class="source-pill">Community</span>
            <span class="page-pill">Open suggestion</span>
          </div>
        </div>
        <span class="open-link">Suggest <span class="open-link-arrow" aria-hidden="true">↗</span></span>
      </a>`
    );
  };

  const renderBook = (entry, target, index) => {
    try {
      const parent = document.getElementById(target);
      if (!parent) {
        return;
      }

      if (!entry) {
        renderSuggestionCard(parent, index);
        return;
      }

      prepareEntryForRender(entry);

      const normalizedLink = getEntryPrimaryLink(entry);
      if (!isValidHttpUrl(normalizedLink)) {
        return;
      }

      const safeName = escapeHtml(entry.Name || "Untitled");
      const safeAuthor = escapeHtml(entry.Author || "Unknown author");
      const safeSummary = escapeHtml(getEntrySummary(entry));
      const summaryMarkup = safeSummary
        ? `<p class="resource-summary" title="${safeSummary}" data-summary-toggle role="button" tabindex="0" aria-expanded="false">${safeSummary}</p>`
        : "";
      const safeLink = escapeHtml(normalizedLink);
      const category = (entry.Category || "").toString();
      const isFilm =
        category === "films" || category === "tv" || category === "documentaries";
      const isBookCategory =
        category === "books" || category === "fiction_books" || category === "non_fiction_books";
      const safeImageUrl = sanitizeImageUrl(entry.Image || "");
      if (entry.Image !== safeImageUrl) {
        entry.Image = safeImageUrl;
      }
      const lookupKey = getEntryLookupKey(entry);
      if (!lookupKey) {
        return;
      }
      const safeLookupKey = escapeHtml(lookupKey);
      const readingRecord = getReadingListRecord(lookupKey);
      const isSaved = Boolean(readingRecord);
      const progressValue = readingRecord && isValidProgressStatus(readingRecord.status)
        ? readingRecord.status
        : "";
      const progressOptionsMarkup = getProgressOptionsMarkup(progressValue);
      const ratingValue = getResourceRating(lookupKey);
      const entryDomKey = toSafeDomId(
        `${entry.Name || "untitled"}-${entry.Author || "unknown"}`
      );
      const coverElementId = `book-cover-${toSafeDomId(target)}-${entryDomKey}`;
      const pageElementId = `book-pages-${toSafeDomId(target)}-${entryDomKey}`;
      const yearElementId = `book-year-${toSafeDomId(target)}-${entryDomKey}`;
      const statusElementId = `book-status-${toSafeDomId(target)}-${entryDomKey}`;
      const pageCountText = getPageCountLabel(entry);
      const levelText = getEntryLevel(entry);
      const timeText = getEntryTimeLabel(entry);
      const yearValue = getEntryYear(entry);
      const yearText = yearValue ? `${yearValue}` : "";
      const coverClassName = `book-image${entry.__coverIsLogo ? " is-logo" : ""}`;
      const coverMarkup = safeImageUrl
        ? `<img class="${coverClassName}" src="${escapeHtml(safeImageUrl)}" loading="lazy" alt="${safeName} cover" />`
        : buildCoverPlaceholderMarkup(entry.Name || "");
      // A pinned `YouTubeVideoId` (a verified upload of the entry's own
      // channel) gives channel entries a real thumbnail plus inline playback;
      // video entries keep deriving the id from their own link.
      const pinnedYoutubeVideoId = /^[\w-]{11}$/.test((entry.YouTubeVideoId || "").toString().trim())
        ? entry.YouTubeVideoId.toString().trim()
        : "";
      const youtubeVideoId =
        (category === "youtube" ? getYoutubeVideoId(normalizedLink) : "") || pinnedYoutubeVideoId;
      const youtubeThumbnailUrl = youtubeVideoId
        ? `https://i.ytimg.com/vi/${escapeHtml(youtubeVideoId)}/hqdefault.jpg`
        : "";
      const playBadgeMarkup = `<span class="youtube-play-badge" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>`;
      const coverElementMarkup = youtubeVideoId
        ? `<span id="${coverElementId}" class="book-cover resource-cover-link youtube-cover" data-youtube-id="${escapeHtml(youtubeVideoId)}" role="button" tabindex="0" aria-expanded="false" aria-label="Play ${safeName} inline">
            <img class="book-image" src="${youtubeThumbnailUrl}" loading="lazy" alt="${safeName} video thumbnail" />
            ${playBadgeMarkup}
          </span>`
        : `<a id="${coverElementId}" href="${safeLink}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="book-cover resource-cover-link" aria-label="Open ${safeName}">
            ${coverMarkup}
          </a>`;

      const imdbScore = isFilm && (entry.imdb != null && entry.imdb !== "") ? String(entry.imdb) : "";
      const rtScore = isFilm && (entry.rt != null && entry.rt !== "") ? Number(entry.rt) : NaN;
      const hasFilmScores = Boolean(isFilm && (imdbScore || (Number.isFinite(rtScore) && rtScore >= 0)));
      const imdbLogoUrl =
        "https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg";
      const rtLogoUrl =
        "https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg";
      const scoreLinkAttrs = 'target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"';
      const imdbHref = /imdb\.com/i.test(normalizedLink) ? safeLink : "";
      const rtHref = escapeHtml(
        `https://www.rottentomatoes.com/search?search=${encodeURIComponent(entry.Name || "")}`
      );
      const filmScoresMarkup = hasFilmScores
        ? `<div class="film-scores">
            ${
              imdbScore
                ? `<a class="film-score" ${imdbHref ? `href="${imdbHref}" ${scoreLinkAttrs} ` : ""}title="View on IMDb"><img class="film-score-logo" src="${escapeHtml(
                    imdbLogoUrl
                  )}" alt="IMDb logo" /><span class="film-score-label">IMDb</span><span class="film-score-value">${escapeHtml(
                    imdbScore
                  )}</span></a>`
                : ""
            }
            ${
              Number.isFinite(rtScore) && rtScore >= 0
                ? `<a class="film-score" href="${rtHref}" ${scoreLinkAttrs} title="Search on Rotten Tomatoes"><img class="film-score-logo" src="${escapeHtml(
                    rtLogoUrl
                  )}" alt="Rotten Tomatoes logo" /><span class="film-score-label">Rotten Tomatoes</span><span class="film-score-value">${escapeHtml(
                    String(rtScore)
                  )}%</span></a>`
                : ""
            }
          </div>`
        : "";

      const goodreadsScore = entry.goodreads != null && entry.goodreads !== "" ? String(entry.goodreads) : "";
      const hasBookScore = Boolean(isBookCategory && goodreadsScore);
      const goodreadsLogoUrl = "https://www.goodreads.com/favicon.ico";
      const bookScoresMarkup = hasBookScore
        ? `<div class="film-scores book-scores">
            <span class="film-score" title="Goodreads rating"><img class="film-score-logo" src="${escapeHtml(
              goodreadsLogoUrl
            )}" alt="Goodreads logo" /><span class="film-score-label">Goodreads</span><span class="film-score-value">${escapeHtml(
              goodreadsScore
            )}</span></span>
          </div>`
        : "";

      parent.insertAdjacentHTML(
        "beforeend",
        `
        <article class="hypothesis book resource-card responsive w-inline-block${isSaved ? " is-saved" : ""}" data-lookup-key="${safeLookupKey}">
          <span class="book-rank">${formatRank(index)}</span>
          ${coverElementMarkup}
          <div class="book-main">
            <a href="${safeLink}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="resource-title-link">
              <h4 class="idea-header book">${safeName}</h4>
            </a>
            <span class="author" title="${safeAuthor}">${safeAuthor}</span>
            ${summaryMarkup}
            <div class="book-meta">
              <span class="source-pill">${getDisplaySourceLabel(entry, normalizedLink)}</span>
              <span id="${statusElementId}" class="page-pill status-pill${progressValue ? "" : " is-hidden"}">${escapeHtml(getReadingProgressLabel(progressValue))}</span>
              <span class="page-pill level-pill${levelText ? "" : " is-hidden"}">${escapeHtml(levelText)}</span>
              <span class="page-pill time-pill${timeText ? "" : " is-hidden"}">${escapeHtml(timeText)}</span>
              <span id="${yearElementId}" class="page-pill year-pill${yearText ? "" : " is-hidden"}">${yearText}</span>
              <span id="${pageElementId}" class="page-pill${pageCountText ? "" : " is-hidden"}">${pageCountText}</span>
            </div>
            ${filmScoresMarkup}
            ${bookScoresMarkup}
            <div class="resource-actions">
              ${getStarRatingMarkup(safeLookupKey, safeName, ratingValue)}
              <button type="button" class="resource-save-button${isSaved ? " is-saved" : ""}" data-save-toggle="${safeLookupKey}" aria-pressed="${isSaved ? "true" : "false"}">
                ${isSaved ? "Saved" : "Save"}
              </button>
              <select class="resource-progress-select" data-progress-select="${safeLookupKey}" aria-label="Progress for ${safeName}">
                ${progressOptionsMarkup}
              </select>
              <button type="button" class="resource-save-button resource-share-button" data-share-toggle="${safeLookupKey}" aria-label="Copy link to ${safeName}">
                Copy link
              </button>
            </div>
          </div>
          <a href="${safeLink}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="open-link resource-open-link">Open <span class="open-link-arrow" aria-hidden="true">↗</span></a>
        </article>`
      );
      wireCoverFallback(coverElementId, entry.Name || "Book");

      // Only fetch on load for entries actually missing a cover/poster;
      // entries that already ship an image make no network request. Year and
      // page counts are filled opportunistically from the same lookup.
      // Film/TV/documentary posters and non-book images resolve only from a
      // pinned Wikipedia article (`Wikipedia`): fuzzy title search too often
      // returns a same-titled but different work, so without a pin we prefer
      // the letter placeholder over a misleading image. Books may always
      // hydrate — their pinned id (`OpenLibraryWork`) is tried first and their
      // fuzzy lookups require an exact title+author match.
      const needsHydration =
        !entry.Image &&
        !entry.__disableImage &&
        !youtubeVideoId &&
        (isBookCategory || Boolean(entry.Wikipedia));
      if (needsHydration) {
        queueMetadataHydration(entry, { coverElementId, pageElementId, yearElementId });
      }
    } catch (error) {
      logResilienceWarning(
        "entry_render_skipped_due_error",
        { name: entry && entry.Name },
        error
      );
    }
  };

  const applyReadingRecordToCardElement = (cardElement, record) => {
    if (!cardElement) {
      return;
    }
    const isSaved = Boolean(record);
    cardElement.classList.toggle("is-saved", isSaved);

    const saveButton = cardElement.querySelector("[data-save-toggle]");
    if (saveButton) {
      saveButton.textContent = isSaved ? "Saved" : "Save";
      saveButton.classList.toggle("is-saved", isSaved);
      saveButton.setAttribute("aria-pressed", isSaved ? "true" : "false");
    }

    const progressSelect = cardElement.querySelector("[data-progress-select]");
    if (progressSelect) {
      const nextProgressValue =
        record && isValidProgressStatus(record.status) ? record.status : "";
      progressSelect.value = nextProgressValue;
    }

    const statusPill = cardElement.querySelector(".status-pill");
    if (statusPill) {
      const nextStatus =
        record && isValidProgressStatus(record.status) ? record.status : "";
      statusPill.textContent = getReadingProgressLabel(nextStatus);
      statusPill.classList.toggle("is-hidden", !nextStatus);
    }
  };

  const applyRatingToCardElement = (cardElement, ratingValue = 0) => {
    if (!cardElement) {
      return;
    }
    cardElement.querySelectorAll("[data-rate-value]").forEach((starButton) => {
      const starValue = Number(starButton.getAttribute("data-rate-value"));
      if (!Number.isFinite(starValue)) {
        return;
      }
      starButton.classList.toggle("is-active", ratingValue >= starValue);
      starButton.setAttribute(
        "aria-pressed",
        ratingValue === starValue ? "true" : "false"
      );
    });
  };

  const syncRatingToRenderedCards = (lookupKey) => {
    if (!lookupKey) {
      return;
    }
    const ratingValue = getResourceRating(lookupKey);
    document.querySelectorAll(".resource-card[data-lookup-key]").forEach((card) => {
      if (card && card.getAttribute("data-lookup-key") === lookupKey) {
        applyRatingToCardElement(card, ratingValue);
      }
    });
  };

  const syncReadingRecordToRenderedCards = (lookupKey) => {
    if (!lookupKey) {
      return;
    }
    const record = getReadingListRecord(lookupKey);
    const cards = document.querySelectorAll(".resource-card[data-lookup-key]");
    cards.forEach((card) => {
      if (card && card.getAttribute("data-lookup-key") === lookupKey) {
        applyReadingRecordToCardElement(card, record);
      }
    });
  };

  const getEntryByLookupKey = (lookupKey) =>
    (lookupKey && latestEntryLookup && latestEntryLookup.get(lookupKey)) || null;

  const toggleReadingListRecord = (lookupKey) => {
    if (!lookupKey) {
      return;
    }
    const existingRecord = getReadingListRecord(lookupKey);
    if (existingRecord) {
      removeReadingListRecord(lookupKey);
      syncReadingRecordToRenderedCards(lookupKey);
      renderReadingDashboard();
      return;
    }

    const entry = getEntryByLookupKey(lookupKey);
    if (!entry) {
      logResilienceWarning("reading_list_add_missing_entry", { lookupKey });
      return;
    }
    updateReadingListRecord(lookupKey, entry, "to_read");
    syncReadingRecordToRenderedCards(lookupKey);
    renderReadingDashboard();
  };

  const updateReadingProgress = (lookupKey, statusValue = "") => {
    if (!lookupKey) {
      return;
    }
    const normalizedStatus = isValidProgressStatus(statusValue) ? statusValue : "";
    const existingRecord = getReadingListRecord(lookupKey);
    const entry = getEntryByLookupKey(lookupKey);

    if (!existingRecord && !entry) {
      logResilienceWarning("reading_progress_update_missing_entry", {
        lookupKey,
        statusValue: normalizedStatus,
      });
      return;
    }

    updateReadingListRecord(lookupKey, entry || existingRecord, normalizedStatus);
    syncReadingRecordToRenderedCards(lookupKey);
    renderReadingDashboard();
  };

  const buildEntryLookup = () => {
    const byLookupKey = new Map();
    const allEntries =
      typeof resources !== "undefined" && Array.isArray(resources) ? resources : [];
    if (!allEntries.length) {
      logResilienceError("resource_dataset_unavailable", {
        hasResourcesArray:
          typeof resources !== "undefined" && Array.isArray(resources),
        resourceCount: allEntries.length,
      });
    }
    const categoryKeysFromData = {
      non_fiction_books: new Set(),
      fiction_books: new Set(),
      academic_papers: new Set(),
      courses: new Set(),
      films: new Set(),
      tv: new Set(),
      documentaries: new Set(),
      podcasts: new Set(),
      websites: new Set(),
      youtube: new Set(),
    };

    allEntries.forEach((entry) => {
      try {
        if (!entry || !entry.Name) {
          return;
        }

        prepareEntryForRender(entry);
        let categoryKey = (entry.Category || "").toString();
        if (categoryKey === "books") {
          const isFiction = fictionBookTitles.has(entry.Name);
          categoryKey = isFiction ? "fiction_books" : "non_fiction_books";
          entry.Category = categoryKey;
        }
        const lookupKey = getEntryLookupKey(entry);
        if (!lookupKey || isEntryDisabledByGuardrails(entry, lookupKey)) {
          return;
        }

        if (!byLookupKey.has(lookupKey)) {
          byLookupKey.set(lookupKey, entry);
        } else {
          const existingEntry = byLookupKey.get(lookupKey);
          if (existingEntry) {
            const shouldSwapPrimary =
              getEntryQualityScore(entry) > getEntryQualityScore(existingEntry);
            const primaryEntry = shouldSwapPrimary ? entry : existingEntry;
            const secondaryEntry = shouldSwapPrimary ? existingEntry : entry;

            byLookupKey.set(lookupKey, mergeEntryData(primaryEntry, secondaryEntry));
          }
        }

        if (categoryKeysFromData[categoryKey]) {
          categoryKeysFromData[categoryKey].add(lookupKey);
        }
      } catch (error) {
        logResilienceWarning(
          "entry_data_skipped_due_error",
          { name: entry && entry.Name },
          error
        );
      }
    });

    return { byLookupKey, categoryKeysFromData };
  };

  const sortControl = document.getElementById("category-sort-control");
  const levelControl = document.getElementById("category-level-control");
  const yearFromControl = document.getElementById("category-year-from-control");
  const yearToControl = document.getElementById("category-year-to-control");
  const filterResetButton = document.getElementById("category-filter-reset");
  const searchControl = document.getElementById("category-search-control");
  const searchClearButton = document.getElementById("category-search-clear");
  const resultsNoteElement = document.getElementById("category-results-note");
  const heroResourceCountElement = document.getElementById("hero-resource-count");
  const libraryEmptyStateElement = document.getElementById("library-empty-state");
  const libraryEmptyStateResetButton = document.getElementById("library-empty-state-reset");

  const getSortMode = () => (sortControl && sortControl.value) || "year_desc";

  const getSearchQuery = () =>
    normalizeStringInput((searchControl && searchControl.value) || "").toLowerCase();

  const getFilterState = () => {
    let fromYear = normalizeYear((yearFromControl && yearFromControl.value) || "");
    let toYear = normalizeYear((yearToControl && yearToControl.value) || "");
    if (fromYear && toYear && fromYear > toYear) {
      [fromYear, toYear] = [toYear, fromYear];
      if (yearFromControl && yearToControl) {
        yearFromControl.value = `${fromYear}`;
        yearToControl.value = `${toYear}`;
      }
    }
    const query = getSearchQuery();
    const level = validLevels.includes((levelControl && levelControl.value) || "")
      ? levelControl.value
      : "";
    return {
      fromYear,
      toYear,
      query,
      level,
      queryTokens: query ? query.split(" ") : [],
    };
  };

  const hasActiveFilters = (filters) =>
    Boolean(filters && (filters.fromYear || filters.toYear || filters.query || filters.level));

  const updateYearSelectOptions = (control, years = []) => {
    if (!control) {
      return;
    }
    const currentValue = normalizeYear(control.value);
    const optionsMarkup = [
      '<option value="">Any</option>',
      ...years.map((year) => `<option value="${year}">${year}</option>`),
    ].join("");
    control.innerHTML = optionsMarkup;
    if (currentValue && years.includes(currentValue)) {
      control.value = `${currentValue}`;
    }
  };

  const syncYearFilterControls = (entryLookup = new Map()) => {
    const years = [...entryLookup.values()]
      .map((entry) => getEntryYear(entry))
      .filter((year) => Number.isFinite(year))
      .filter((year, index, values) => values.indexOf(year) === index)
      .sort((left, right) => left - right);
    updateYearSelectOptions(yearFromControl, years);
    updateYearSelectOptions(yearToControl, years);
  };

  const resourceTagsByName =
    (typeof window !== "undefined" && window.RESOURCE_TAGS) || {};

  const getEntrySearchText = (entry = {}) => {
    if (!entry.__searchText) {
      const summary = (
        entry.Summary ||
        entry.summary ||
        seededEntrySummaries[entry.Name] ||
        ""
      ).toString();
      // Fold derived topic tags into the search text so topic chips (and typed
      // topic words) match resources even when the term isn't in the summary.
      const tags = Array.isArray(resourceTagsByName[entry.Name])
        ? resourceTagsByName[entry.Name].join(" ")
        : "";
      entry.__searchText =
        `${entry.Name || ""} ${entry.Author || ""} ${summary} ${tags}`.toLowerCase();
    }
    return entry.__searchText;
  };

  const entryMatchesFilters = (entry, filters) => {
    if (!entry) {
      return false;
    }
    if (filters.queryTokens && filters.queryTokens.length) {
      const searchText = getEntrySearchText(entry);
      if (!filters.queryTokens.every((token) => searchText.includes(token))) {
        return false;
      }
    }
    if (filters.level && getEntryLevel(entry) !== filters.level) {
      return false;
    }
    if (!filters.fromYear && !filters.toYear) {
      return true;
    }
    const entryYear = getEntryYear(entry);
    if (!entryYear) {
      return false;
    }
    if (filters.fromYear && entryYear < filters.fromYear) {
      return false;
    }
    if (filters.toYear && entryYear > filters.toYear) {
      return false;
    }
    return true;
  };

  const compareEntriesByYearAsc = (left, right) => {
    const leftYear = getEntryYear(left);
    const rightYear = getEntryYear(right);
    const leftHasYear = Number.isFinite(leftYear);
    const rightHasYear = Number.isFinite(rightYear);

    if (leftHasYear && rightHasYear) {
      if (leftYear !== rightYear) {
        return leftYear - rightYear;
      }
    } else if (leftHasYear) {
      return -1;
    } else if (rightHasYear) {
      return 1;
    }

    return (left.Name || "").localeCompare(right.Name || "");
  };

  const sortSelectedEntries = (entries, sortMode) => {
    if (sortMode === "year_desc") {
      return [...entries].sort((left, right) => compareEntriesByYearAsc(right, left));
    }
    if (sortMode === "year_asc") {
      return [...entries].sort(compareEntriesByYearAsc);
    }
    if (sortMode === "title_asc") {
      return [...entries].sort((left, right) =>
        (left.Name || "").localeCompare(right.Name || "")
      );
    }
    return entries;
  };

  const renderCategoryFallbackState = (
    parent,
    title = "Resources temporarily unavailable",
    copy = "We could not load this category right now. Please refresh, or suggest a resource below."
  ) => {
    if (!parent) {
      return;
    }
    parent.insertAdjacentHTML(
      "beforeend",
      `
      <article class="resource-empty-state" role="status" aria-live="polite">
        <h4 class="resource-empty-state-title">${escapeHtml(title)}</h4>
        <p class="resource-empty-state-copy">${escapeHtml(copy)}</p>
      </article>
      `
    );
  };

  const renderAllBooks = () => {
    let entryLookup;
    let categoryKeysFromData;
    try {
      const lookupResult = buildEntryLookup();
      entryLookup = lookupResult.byLookupKey;
      categoryKeysFromData = lookupResult.categoryKeysFromData;
      latestEntryLookup = entryLookup;
      if (!window.localStorage.getItem("rwwc-reading-list-keys-normalized")) {
        normalizeReadingListKeys(entryLookup);
        try {
          window.localStorage.setItem("rwwc-reading-list-keys-normalized", "1");
        } catch (e) {}
      }
      usedSummarySet.clear();
      entryLookup.forEach((entry) => {
        if (entry && entry.__resolvedSummary) {
          delete entry.__resolvedSummary;
        }
      });
      syncYearFilterControls(entryLookup);
    } catch (error) {
      logResilienceError("resource_lookup_build_failed", {}, error);
      categoryTargets.forEach(({ parentId }) => {
        const categoryParent = document.getElementById(parentId);
        if (!categoryParent) {
          return;
        }
        categoryParent.innerHTML = "";
        renderCategoryFallbackState(categoryParent);
        renderBook(null, parentId, 0);
      });
      return;
    }
    const sortMode = getSortMode();
    const filterState = getFilterState();
    const usingFilters = hasActiveFilters(filterState);
    const nextEntryCategoryLookup = new Map();
    const nextTrackTotals = new Map(
      Object.keys(trackLabels).map((trackKey) => [trackKey, 0])
    );
    let totalMatchingEntries = 0;

    categoryTargets.forEach(({ key, parentId }) => {
      try {
        const selectedLookupKeys = new Set();
        (categoryKeysFromData[key] || new Set()).forEach((lookupKey) => {
          if (lookupKey) {
            selectedLookupKeys.add(lookupKey);
          }
        });
        const categoryParent = document.getElementById(parentId);
        if (!categoryParent) {
          return;
        }
        categoryParent.innerHTML = "";

        const selectedEntries = [...selectedLookupKeys]
          .map((lookupKey) => entryLookup.get(lookupKey))
          .filter(Boolean);
        selectedLookupKeys.forEach((lookupKey) => {
          if (lookupKey && entryLookup.has(lookupKey) && !nextEntryCategoryLookup.has(lookupKey)) {
            nextEntryCategoryLookup.set(lookupKey, key);
          }
        });
        nextTrackTotals.set(key, selectedEntries.length);
        const filteredEntries = selectedEntries.filter((entry) =>
          entryMatchesFilters(entry, filterState)
        );
        totalMatchingEntries += filteredEntries.length;

        const tabCountElement = document.querySelector(
          `.gauntlet-tab[data-w-tab="${parentId.replace(/-parent$/, "")}"] [data-tab-count]`
        );
        if (tabCountElement) {
          tabCountElement.textContent = `${filteredEntries.length}`;
        }

        // Mark the pane empty/non-empty so that, while searching across all
        // categories, panes with no matches can be hidden via CSS.
        const ownerPane = categoryParent.closest(".w-tab-pane");
        if (ownerPane) {
          ownerPane.dataset.empty = filteredEntries.length ? "false" : "true";
        }

        const orderedEntries = sortSelectedEntries(filteredEntries, sortMode);

        if (!orderedEntries.length) {
          if (usingFilters) {
            renderCategoryFallbackState(
              categoryParent,
              "No matches in this category",
              "Try a different search term, or reset the search and year filters."
            );
          } else {
            renderCategoryFallbackState(categoryParent);
          }
        } else {
          orderedEntries.forEach((entry, index) => {
            renderBook(entry, parentId, index);
          });
        }
        renderBook(null, parentId, orderedEntries.length);
      } catch (error) {
        logResilienceWarning(
          "category_render_skipped_due_error",
          { categoryKey: key },
          error
        );
      }
    });
    latestEntryCategoryLookup = nextEntryCategoryLookup;
    latestTrackTotals = nextTrackTotals;

    // A text query turns the per-tab library into a single cross-category
    // results view: every non-empty pane is shown stacked (its category intro
    // acts as the section header). Year-only filters keep the normal tab view.
    if (libraryContent) {
      libraryContent.classList.toggle("is-searching", Boolean(filterState.query));
    }

    if (libraryEmptyStateElement) {
      libraryEmptyStateElement.hidden = !(
        filterState.query && totalMatchingEntries === 0
      );
    }

    if (resultsNoteElement) {
      if (usingFilters) {
        resultsNoteElement.hidden = false;
        resultsNoteElement.textContent =
          totalMatchingEntries === 1
            ? "1 resource matches across all categories."
            : `${totalMatchingEntries} resources match across all categories.`;
      } else {
        resultsNoteElement.hidden = true;
        resultsNoteElement.textContent = "";
      }
    }

    if (heroResourceCountElement && entryLookup.size) {
      heroResourceCountElement.hidden = false;
      // Count distinct formats actually present, collapsing the two book tracks
      // (fiction/non-fiction) into a single "books" format. Derived from the
      // data so the copy never goes stale as new tracks are added.
      const formatsWithResources = new Set();
      nextTrackTotals.forEach((count, trackKey) => {
        if (count > 0) {
          formatsWithResources.add(
            trackKey === "non_fiction_books" || trackKey === "fiction_books"
              ? "books"
              : trackKey
          );
        }
      });
      const formatCountLabel = numberToWord(formatsWithResources.size);
      heroResourceCountElement.textContent = `${entryLookup.size} curated resources across ${formatCountLabel} formats`;
    }

    renderReadingDashboard();
  };

  // ── "Recommended for you" ─────────────────────────────────────────────────
  // A lightweight content-based recommender: builds a profile from the saved
  // list and star ratings (topic tags, formats, levels) and surfaces the
  // highest-overlap resources the user hasn't saved or rated yet. Star ratings
  // weight the profile — 4–5 stars pull similar resources in, 1–2 stars push
  // them away. Everything runs client-side against the already-loaded dataset.
  const recsSection = document.getElementById("recs-section");
  const recsGrid = document.getElementById("recs-grid");
  const recommendationTagLabels = {
    interpretability: "interpretability",
    alignment: "alignment",
    governance: "governance & policy",
    "existential-risk": "existential risk",
    deception: "deception & scheming",
    rl: "reinforcement learning",
    forecasting: "forecasting & timelines",
    ethics: "ethics & society",
    llms: "language model",
    fiction: "fiction",
  };

  const getEntryTopicTags = (entry = {}) =>
    Array.isArray(resourceTagsByName[entry.Name]) ? resourceTagsByName[entry.Name] : [];

  const renderRecommendations = () => {
    if (!recsSection || !recsGrid) {
      return;
    }
    const hideRecommendations = () => {
      recsSection.hidden = true;
      recsGrid.innerHTML = "";
    };
    try {
      const savedKeys = new Set(Object.keys(readingListState));
      const ratedEntries = Object.entries(ratingsState);
      if ((!savedKeys.size && !ratedEntries.length) || !latestEntryLookup.size) {
        hideRecommendations();
        return;
      }

      // Profile: weighted affinity for each tag / track / level. Saved items
      // count once; rated items count by how far the rating sits from neutral
      // (3 stars), so 5 stars is a stronger pull than a save and 1–2 stars is
      // an active push away.
      const ratingProfileWeights = { 1: -1.5, 2: -0.75, 3: 0.25, 4: 1, 5: 1.75 };
      const tagWeights = new Map();
      const trackWeights = new Map();
      const levelWeights = new Map();
      const highlyRatedTags = new Set();
      const engagedKeys = new Set();

      const addEntrySignals = (lookupKey, weight, isHighRating) => {
        const entry = latestEntryLookup.get(lookupKey);
        if (!entry || !weight) {
          return;
        }
        getEntryTopicTags(entry).forEach((tag) => {
          tagWeights.set(tag, (tagWeights.get(tag) || 0) + weight);
          if (isHighRating) {
            highlyRatedTags.add(tag);
          }
        });
        const trackKey = latestEntryCategoryLookup.get(lookupKey) || getEntryBucketKey(entry);
        if (trackKey) {
          trackWeights.set(trackKey, (trackWeights.get(trackKey) || 0) + weight);
        }
        const level = getEntryLevel(entry);
        if (level) {
          levelWeights.set(level, (levelWeights.get(level) || 0) + weight);
        }
      };

      savedKeys.forEach((lookupKey) => {
        engagedKeys.add(lookupKey);
        addEntrySignals(lookupKey, 1, false);
      });
      ratedEntries.forEach(([lookupKey, record]) => {
        engagedKeys.add(lookupKey);
        const weight = ratingProfileWeights[record.rating] || 0;
        addEntrySignals(lookupKey, weight, record.rating >= 4);
      });

      // Score every resource the user hasn't engaged with yet: shared topics
      // dominate, format and level affinity break ties, and negative weights
      // from low ratings drag lookalikes down.
      const scored = [];
      latestEntryLookup.forEach((entry, lookupKey) => {
        if (engagedKeys.has(lookupKey)) {
          return;
        }
        const trackKey = latestEntryCategoryLookup.get(lookupKey) || getEntryBucketKey(entry);
        let score = 0;
        let bestTag = "";
        let bestTagWeight = 0;
        getEntryTopicTags(entry).forEach((tag) => {
          const weight = tagWeights.get(tag) || 0;
          if (!weight) {
            return;
          }
          score += weight * 2;
          if (weight > bestTagWeight) {
            bestTagWeight = weight;
            bestTag = tag;
          }
        });
        score += (trackWeights.get(trackKey) || 0) * 0.75;
        score += (levelWeights.get(getEntryLevel(entry)) || 0) * 0.25;
        if (score > 0) {
          scored.push({ lookupKey, entry, trackKey, score, bestTag });
        }
      });
      if (!scored.length) {
        hideRecommendations();
        return;
      }
      scored.sort(
        (left, right) =>
          right.score - left.score ||
          (left.entry.Name || "").localeCompare(right.entry.Name || "")
      );

      // Keep the row varied: at most two picks from any single format, and a
      // cross-listed resource (same title in two tracks) only once.
      const picks = [];
      const picksPerTrack = new Map();
      const pickedTitles = new Set();
      for (const candidate of scored) {
        const titleKey = getTitleLookupKey(candidate.entry.Name || "");
        if (pickedTitles.has(titleKey)) {
          continue;
        }
        const trackPickCount = picksPerTrack.get(candidate.trackKey) || 0;
        if (trackPickCount >= 2) {
          continue;
        }
        pickedTitles.add(titleKey);
        picksPerTrack.set(candidate.trackKey, trackPickCount + 1);
        picks.push(candidate);
        if (picks.length === 4) {
          break;
        }
      }

      recsGrid.innerHTML = picks
        .map(({ lookupKey, entry, trackKey, bestTag }) => {
          const safeName = escapeHtml(entry.Name || "Untitled");
          const safeAuthor = escapeHtml(entry.Author || "");
          const trackLabel = trackLabels[trackKey] || "";
          const level = getEntryLevel(entry);
          const kind = [trackLabel, level].filter(Boolean).join(" · ");
          let why;
          if (bestTag && recommendationTagLabels[bestTag]) {
            why = highlyRatedTags.has(bestTag)
              ? `Because you rated ${recommendationTagLabels[bestTag]} resources highly`
              : `Because you saved ${recommendationTagLabels[bestTag]} resources`;
          } else if ((trackWeights.get(trackKey) || 0) > 0) {
            why = `More ${trackLabel || "picks"} like your favorites`;
          } else {
            why = "Matches the level of your picks";
          }
          return `<a class="path-card" href="#r-${encodeURIComponent(lookupKey)}" data-rec-key="${escapeHtml(lookupKey)}">
            <span class="path-card-kind">${escapeHtml(kind)}</span>
            <span class="path-card-title">${safeName}</span>
            <span class="path-card-why">${safeAuthor ? `${safeAuthor} — ` : ""}${escapeHtml(why)}</span>
          </a>`;
        })
        .join("");
      recsSection.hidden = false;
    } catch (error) {
      logResilienceWarning("recommendations_render_failed", {}, error);
      hideRecommendations();
    }
  };

  if (recsGrid) {
    recsGrid.addEventListener("click", (event) => {
      const recCard = event.target && typeof event.target.closest === "function"
        ? event.target.closest("[data-rec-key]")
        : null;
      if (!recCard) {
        return;
      }
      const lookupKey = recCard.getAttribute("data-rec-key") || "";
      if (!lookupKey) {
        return;
      }
      if (hasActiveFilters(getFilterState())) {
        resetLibraryFilters();
      }
      // The href's hashchange normally triggers the highlight; when the hash
      // is already this resource (re-click), fire it directly.
      if (window.location.hash === `#r-${encodeURIComponent(lookupKey)}`) {
        highlightCardByLookupKey(lookupKey);
      }
    });
  }

  const suggestionForm = document.getElementById("book-suggestion-form");
  const suggestionFeedback = document.getElementById("suggestion-feedback");
  const suggestionSubmitButton = suggestionForm
    ? suggestionForm.querySelector('button[type="submit"]')
    : null;
  const suggestionLinkInput = document.getElementById("suggestion-link");

  if (suggestionLinkInput) {
    // Reflect the normalized link back to the user (adds https:// to bare domains).
    suggestionLinkInput.addEventListener("blur", () => {
      const normalized = normalizeLinkInput(suggestionLinkInput.value);
      if (normalized && normalized !== suggestionLinkInput.value) {
        suggestionLinkInput.value = normalized;
      }
    });
  }

  // `type` drives the visual state: "error" | "success" | "" (neutral info).
  const setFeedback = (message, type = "") => {
    if (suggestionFeedback) {
      suggestionFeedback.textContent = message;
      suggestionFeedback.classList.toggle("is-error", type === "error");
      suggestionFeedback.classList.toggle("is-success", type === "success");
    }
  };

  const getSuggestionValues = () => {
    if (!suggestionForm) {
      return null;
    }

    const formData = new FormData(suggestionForm);
    return {
      name: (formData.get("name") || "").toString().trim(),
      author: (formData.get("author") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim(),
      link: (formData.get("link") || "").toString().trim(),
      track: (formData.get("track") || "non_fiction_books").toString(),
    };
  };

  const hasPlaceholder = (value = "") =>
    value.toString().includes("REPLACE_WITH_FORM_ID");

  const isHttpsUrl = (value = "") => /^https:\/\/.+/i.test(value.toString());

  const isEntryField = (value = "") =>
    /^entry\.\d+$/.test(value.toString());

  const isAppsScriptConfigured = () =>
    isHttpsUrl(submissionConfig.appsScript.endpointUrl) &&
    !hasPlaceholder(submissionConfig.appsScript.endpointUrl);

  const isEmailConfigured = () => {
    const to = (submissionConfig.email && submissionConfig.email.to || "").toString().trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
  };

  const isGoogleFormConfigured = () => {
    const requiredFieldNames = ["name", "author", "link", "track"];
    const configuredFields = submissionConfig.googleForm.fields || {};

    if (!submissionConfig.googleForm.formResponseUrl || hasPlaceholder(submissionConfig.googleForm.formResponseUrl)) {
      return false;
    }

    if (!submissionConfig.googleForm.formResponseUrl.includes("/formResponse")) {
      return false;
    }

    return requiredFieldNames.every(
      (fieldName) => configuredFields[fieldName] && isEntryField(configuredFields[fieldName])
    );
  };

  const getSubmissionMode = () => {
    const requestedMode = (submissionConfig.mode || "").toLowerCase();

    if (requestedMode === "email" && isEmailConfigured()) {
      return "email";
    }
    if (requestedMode === "apps_script" && isAppsScriptConfigured()) {
      return "apps_script";
    }
    if (requestedMode === "google_form" && isGoogleFormConfigured()) {
      return "google_form";
    }
    if (isEmailConfigured()) {
      return "email";
    }
    if (isAppsScriptConfigured()) {
      return "apps_script";
    }
    if (isGoogleFormConfigured()) {
      return "google_form";
    }

    return null;
  };

  const submitSuggestionViaEmail = (data) => {
    const to = (submissionConfig.email && submissionConfig.email.to || "").toString().trim();
    const subject = encodeURIComponent(`Suggestion: ${(data.name || "").trim() || "New resource"}`);
    const trackLabel = trackLabels[data.track] || data.track;
    const bodyLines = [
      `Title: ${(data.name || "").trim()}`,
      `Author (or director, host, etc.): ${(data.author || "").trim()}`,
      `Link: ${(data.link || "").trim()}`,
      `Category: ${trackLabel}`,
      `Your email: ${(data.email || "").trim()}`,
    ];
    const body = encodeURIComponent(bodyLines.join("\n"));
    const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const submitSuggestionToGoogleForm = async (data) => {
    const { fields } = submissionConfig.googleForm;
    const payload = new URLSearchParams();
    payload.set(fields.name, data.name);
    payload.set(fields.author, data.author);
    if (fields.email && isEntryField(fields.email) && data.email) {
      payload.set(fields.email, data.email);
    }
    payload.set(fields.link, data.link);
    if (fields.pages) payload.set(fields.pages, "");
    payload.set(fields.track, trackLabels[data.track] || data.track);

    try {
      await fetchWithTimeout(
        submissionConfig.googleForm.formResponseUrl,
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: payload.toString(),
        },
        submissionTimeoutMs,
        "Google Form suggestion submission"
      );
    } catch (error) {
      logResilienceError(
        "google_form_submission_failed",
        {
          track: data.track,
          hasEmail: Boolean(data.email),
        },
        error
      );
      throw error;
    }
  };

  const submitSuggestionToAppsScript = async (data) => {
    const payload = new URLSearchParams();
    const trackLabel = trackLabels[data.track] || data.track;
    // Send common aliases so different Apps Script schemas all receive values.
    payload.set("name", data.name);
    payload.set("title", data.name);
    payload.set("book_title", data.name);
    payload.set("author", data.author);
    payload.set("email", data.email || "");
    payload.set("submitter_email", data.email || "");
    payload.set("contact_email", data.email || "");
    payload.set("link", data.link);
    payload.set("track_label", trackLabel);
    payload.set("track", trackLabel);
    payload.set("reading_track", trackLabel);
    payload.set("readingTrack", trackLabel);
    payload.set("category", trackLabel);
    payload.set("track_key", data.track || "");
    payload.set("submitted_at", new Date().toISOString());
    payload.set(
      "payload_json",
      JSON.stringify({
        name: data.name,
        title: data.name,
        author: data.author,
        email: data.email || "",
        link: data.link,
        track: trackLabel,
        reading_track: trackLabel,
        category: trackLabel,
        track_key: data.track || "",
      })
    );

    try {
      await fetchWithTimeout(
        submissionConfig.appsScript.endpointUrl,
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: payload.toString(),
        },
        submissionTimeoutMs,
        "Apps Script suggestion submission"
      );
    } catch (error) {
      logResilienceError(
        "apps_script_submission_failed",
        {
          track: data.track,
          hasEmail: Boolean(data.email),
        },
        error
      );
      throw error;
    }
  };

  if (suggestionForm) {
    suggestionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const rawData = getSuggestionValues();
      const data = sanitizeSuggestionInput(rawData);
      const validationError = validateSuggestionInput(data);
      if (validationError) {
        setFeedback(validationError, "error");
        return;
      }

      const submissionMode = getSubmissionMode();
      if (!submissionMode) {
        setFeedback("Suggestion form is not configured yet. Update public/suggestion-form-config.js with a valid endpoint.", "error");
        return;
      }

      try {
        if (suggestionSubmitButton) {
          suggestionSubmitButton.disabled = true;
          suggestionSubmitButton.textContent = "Sending...";
        }

        if (submissionMode === "email") {
          submitSuggestionViaEmail(data);
          suggestionForm.reset();
          setFeedback("Your email client will open. Send the message to submit your suggestion.", "success");
        } else if (submissionMode === "apps_script") {
          await submitSuggestionToAppsScript(data);
          suggestionForm.reset();
          setFeedback("Thanks! Your suggestion was sent.", "success");
        } else {
          await submitSuggestionToGoogleForm(data);
          suggestionForm.reset();
          setFeedback("Thanks! Your suggestion was sent.", "success");
        }
      } catch (error) {
        logResilienceWarning(
          "suggestion_submission_failed",
          {
            mode: submissionMode,
            track: data.track,
          },
          error
        );
        setFeedback("Unable to send suggestion right now. Please try again.", "error");
      } finally {
        if (suggestionSubmitButton) {
          suggestionSubmitButton.disabled = false;
          suggestionSubmitButton.textContent = "Send suggestion";
        }
      }
    });
  }

  if (sortControl) {
    sortControl.addEventListener("change", () => {
      renderAllBooks();
    });
  }

  if (levelControl) {
    levelControl.addEventListener("change", () => {
      renderAllBooks();
    });
  }

  if (yearFromControl) {
    yearFromControl.addEventListener("change", () => {
      renderAllBooks();
    });
  }

  if (yearToControl) {
    yearToControl.addEventListener("change", () => {
      renderAllBooks();
    });
  }

  const searchShortcutHint = document.getElementById("search-shortcut-hint");
  const syncSearchShortcutHint = () => {
    if (searchShortcutHint) {
      searchShortcutHint.hidden = Boolean(
        (searchControl && searchControl.value) || document.activeElement === searchControl
      );
    }
  };

  const syncSearchClearVisibility = () => {
    if (searchClearButton) {
      searchClearButton.hidden = !(searchControl && searchControl.value);
    }
    syncSearchShortcutHint();
  };

  let searchRenderTimer = null;
  const scheduleSearchRender = () => {
    if (searchRenderTimer) {
      clearTimeout(searchRenderTimer);
    }
    searchRenderTimer = setTimeout(() => {
      searchRenderTimer = null;
      renderAllBooks();
    }, 140);
  };

  if (searchControl) {
    searchControl.addEventListener("input", () => {
      syncSearchClearVisibility();
      scheduleSearchRender();
    });
    searchControl.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && searchControl.value) {
        event.preventDefault();
        searchControl.value = "";
        syncSearchClearVisibility();
        renderAllBooks();
      }
    });
    searchControl.addEventListener("focus", syncSearchShortcutHint);
    searchControl.addEventListener("blur", syncSearchShortcutHint);
    syncSearchClearVisibility();
  }

  if (searchClearButton) {
    searchClearButton.addEventListener("click", () => {
      if (!searchControl) {
        return;
      }
      searchControl.value = "";
      syncSearchClearVisibility();
      searchControl.focus();
      renderAllBooks();
    });
  }

  // Press "/" anywhere (outside form fields) to jump to the search box.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const activeElement = event.target;
    if (
      activeElement &&
      typeof activeElement.closest === "function" &&
      (activeElement.closest("input, textarea, select") || activeElement.isContentEditable)
    ) {
      return;
    }
    if (searchControl) {
      event.preventDefault();
      searchControl.focus();
      searchControl.select();
    }
  });

  const resetLibraryFilters = () => {
    if (yearFromControl) {
      yearFromControl.value = "";
    }
    if (yearToControl) {
      yearToControl.value = "";
    }
    if (levelControl) {
      levelControl.value = "";
    }
    if (searchControl) {
      searchControl.value = "";
      syncSearchClearVisibility();
    }
    renderAllBooks();
  };

  if (filterResetButton) {
    filterResetButton.addEventListener("click", () => {
      resetLibraryFilters();
    });
  }

  if (libraryEmptyStateResetButton) {
    libraryEmptyStateResetButton.addEventListener("click", () => {
      resetLibraryFilters();
      if (searchControl) {
        searchControl.focus();
      }
    });
  }

  // Topic chips: clicking one runs a cross-category search for that topic by
  // dropping the tag into the search box and re-rendering. The chips are real
  // links to /topics/<slug>/ (so no-JS visitors and crawlers reach the landing
  // pages); with JS we intercept the click and filter in place instead. The
  // "All topics" chip carries no data-topic-query and is left to navigate.
  const topicChips = document.querySelectorAll(".topic-chip[data-topic-query]");
  if (topicChips.length && searchControl) {
    topicChips.forEach((chip) => {
      chip.addEventListener("click", (event) => {
        event.preventDefault();
        const query = chip.getAttribute("data-topic-query") || "";
        const alreadyActive = searchControl.value === query;
        searchControl.value = alreadyActive ? "" : query;
        syncSearchClearVisibility();
        topicChips.forEach((c) =>
          c.classList.toggle("is-active", !alreadyActive && c === chip)
        );
        renderAllBooks();
        if (!alreadyActive && libraryContent) {
          libraryContent.scrollIntoView({ behavior: motionSafeBehavior(), block: "start" });
        }
      });
    });
    // Keep chip highlight in sync when the search box is edited directly.
    searchControl.addEventListener("input", () => {
      const value = searchControl.value;
      topicChips.forEach((c) =>
        c.classList.toggle("is-active", c.getAttribute("data-topic-query") === value)
      );
    });
  }

  const backToTopButton = document.getElementById("back-to-top");
  if (backToTopButton) {
    const syncBackToTopVisibility = () => {
      backToTopButton.classList.toggle("is-visible", window.scrollY > 600);
    };
    window.addEventListener("scroll", syncBackToTopVisibility, { passive: true });
    syncBackToTopVisibility();
    backToTopButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: motionSafeBehavior() });
    });
  }

  const themeToggleButton = document.getElementById("theme-toggle");
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const themeStorageKey = "rwwc-theme";
  const themeColors = { light: "#f4f1ea", dark: "#15110d" };

  const getActiveTheme = () =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

  const applyThemePreference = (theme, persist = false) => {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", themeColors[nextTheme]);
    }
    if (themeToggleButton) {
      themeToggleButton.setAttribute(
        "aria-label",
        nextTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
    if (persist) {
      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
      } catch (error) {
        // Theme persistence is optional; the toggle still works for the session.
      }
    }
  };

  applyThemePreference(getActiveTheme());

  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", () => {
      applyThemePreference(getActiveTheme() === "dark" ? "light" : "dark", true);
    });
  }

  // Follow the OS theme while the visitor hasn't picked one explicitly.
  if (typeof window.matchMedia === "function") {
    const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = (event) => {
      let storedTheme = null;
      try {
        storedTheme = window.localStorage.getItem(themeStorageKey);
      } catch (error) {
        storedTheme = null;
      }
      if (storedTheme !== "light" && storedTheme !== "dark") {
        applyThemePreference(event.matches ? "dark" : "light");
      }
    };
    if (typeof systemDarkQuery.addEventListener === "function") {
      systemDarkQuery.addEventListener("change", onSystemThemeChange);
    }
  }

  // Mobile cards are full-width and narrow, so summaries are clamped to a
  // uniform 4 lines. Tapping a clamped summary expands it to the full text.
  const mobileSummaryQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 767px)")
      : null;
  const isMobileSummaryViewport = () =>
    mobileSummaryQuery ? mobileSummaryQuery.matches : false;
  const toggleSummaryExpansion = (summaryElement) => {
    const expanded = summaryElement.classList.toggle("is-expanded");
    summaryElement.setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  // Collapse any expanded summaries when leaving the mobile viewport so cards
  // stay uniform on desktop.
  if (mobileSummaryQuery && typeof mobileSummaryQuery.addEventListener === "function") {
    mobileSummaryQuery.addEventListener("change", (event) => {
      if (event.matches) {
        return;
      }
      document
        .querySelectorAll(".resource-summary.is-expanded")
        .forEach((summaryElement) => {
          summaryElement.classList.remove("is-expanded");
          summaryElement.setAttribute("aria-expanded", "false");
        });
    });
  }

  // Inline YouTube playback expands into a full-width 16:9 player inside the
  // card (rather than the small thumbnail) so people can watch here instead
  // of leaving for YouTube.
  const openInlineYoutubePlayer = (trigger) => {
    const videoId = (trigger.getAttribute("data-youtube-id") || "").trim();
    const card = trigger.closest(".resource-card");
    if (!videoId || !card) {
      return;
    }
    const existingRegion = card.querySelector(".youtube-player-region");
    if (existingRegion) {
      existingRegion.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    const safeVideoId = escapeHtml(videoId);
    const titleElement = card.querySelector(".idea-header");
    const videoTitle = (titleElement && titleElement.textContent
      ? titleElement.textContent
      : "YouTube video"
    ).trim();
    const region = document.createElement("div");
    region.className = "youtube-player-region";
    region.innerHTML = `
      <div class="youtube-player-frame">
        <iframe src="https://www.youtube-nocookie.com/embed/${safeVideoId}?autoplay=1&amp;rel=0" title="YouTube video player: ${escapeHtml(videoTitle)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
      <div class="youtube-player-bar">
        <a class="open-link youtube-player-external" href="https://www.youtube.com/watch?v=${safeVideoId}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Watch on YouTube <span class="open-link-arrow" aria-hidden="true">↗</span></a>
        <button type="button" class="resource-save-button youtube-player-close" data-youtube-close aria-label="Close video player for ${escapeHtml(videoTitle)}">Close player</button>
      </div>`;
    card.classList.add("is-playing");
    card.appendChild(region);
    trigger.setAttribute("aria-expanded", "true");
    region.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const closeInlineYoutubePlayer = (closeButton) => {
    const card = closeButton.closest(".resource-card");
    if (!card) {
      return;
    }
    const region = card.querySelector(".youtube-player-region");
    if (region) {
      region.remove();
    }
    card.classList.remove("is-playing");
    const trigger = card.querySelector("[data-youtube-id]");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  };

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const keyTarget = event.target;
    if (!keyTarget || typeof keyTarget.closest !== "function") {
      return;
    }
    const summaryToggle = keyTarget.closest("[data-summary-toggle]");
    if (summaryToggle && isMobileSummaryViewport()) {
      event.preventDefault();
      toggleSummaryExpansion(summaryToggle);
      return;
    }
    const youtubeTrigger = keyTarget.closest("[data-youtube-id]");
    if (youtubeTrigger) {
      event.preventDefault();
      youtubeTrigger.click();
    }
  });

  document.addEventListener(
    "click",
    (event) => {
      const clickTarget = event.target;
      if (!clickTarget || typeof clickTarget.closest !== "function") {
        return;
      }

      const summaryToggle = clickTarget.closest("[data-summary-toggle]");
      if (summaryToggle && isMobileSummaryViewport()) {
        event.preventDefault();
        event.stopPropagation();
        toggleSummaryExpansion(summaryToggle);
        return;
      }

      const saveToggleButton = clickTarget.closest("[data-save-toggle]");
      if (saveToggleButton) {
        event.preventDefault();
        event.stopPropagation();
        const lookupKey = (saveToggleButton.getAttribute("data-save-toggle") || "").trim();
        if (lookupKey) {
          toggleReadingListRecord(lookupKey);
        }
        return;
      }

      const shareButton = clickTarget.closest("[data-share-toggle]");
      if (shareButton) {
        event.preventDefault();
        event.stopPropagation();
        const lookupKey = (shareButton.getAttribute("data-share-toggle") || "").trim();
        if (lookupKey) {
          copyResourceLink(shareButton, lookupKey);
        }
        return;
      }

      const starButton = clickTarget.closest("[data-rate-value]");
      if (starButton) {
        event.preventDefault();
        event.stopPropagation();
        const lookupKey = (starButton.getAttribute("data-rate-key") || "").trim();
        const starValue = normalizeStarRating(
          starButton.getAttribute("data-rate-value")
        );
        if (lookupKey && starValue) {
          // Clicking the current rating again clears it.
          const nextRating = getResourceRating(lookupKey) === starValue ? 0 : starValue;
          setResourceRating(lookupKey, nextRating);
          syncRatingToRenderedCards(lookupKey);
          renderRecommendations();
        }
        return;
      }

      const youtubeCloseButton = clickTarget.closest("[data-youtube-close]");
      if (youtubeCloseButton) {
        event.preventDefault();
        event.stopPropagation();
        closeInlineYoutubePlayer(youtubeCloseButton);
        return;
      }

      const youtubeTrigger = clickTarget.closest("[data-youtube-id]");
      if (youtubeTrigger) {
        event.preventDefault();
        event.stopPropagation();
        openInlineYoutubePlayer(youtubeTrigger);
        return;
      }

      const removeButton = clickTarget.closest("[data-reading-remove-key]");
      if (removeButton) {
        event.preventDefault();
        event.stopPropagation();
        const lookupKey = (removeButton.getAttribute("data-reading-remove-key") || "").trim();
        if (lookupKey) {
          removeReadingListRecord(lookupKey);
          syncReadingRecordToRenderedCards(lookupKey);
          renderReadingDashboard();
        }
      }
    },
    true
  );

  document.addEventListener("change", (event) => {
    const changeTarget = event.target;
    if (!changeTarget || typeof changeTarget.matches !== "function") {
      return;
    }

    if (changeTarget.matches("[data-progress-select]")) {
      const lookupKey = (changeTarget.getAttribute("data-progress-select") || "").trim();
      if (lookupKey) {
        updateReadingProgress(lookupKey, changeTarget.value || "");
      }
      return;
    }

    if (changeTarget.matches("[data-dashboard-progress-select]")) {
      const lookupKey = (changeTarget.getAttribute("data-dashboard-progress-select") || "").trim();
      if (lookupKey) {
        updateReadingProgress(lookupKey, changeTarget.value || "");
      }
    }
  });

  const surpriseMeButton = document.getElementById("surprise-me");
  if (surpriseMeButton) {
    // Announce the chosen resource to screen readers; the visual spotlight
    // alone is invisible to non-visual users.
    const surpriseAnnouncer = document.createElement("p");
    surpriseAnnouncer.className = "visually-hidden";
    surpriseAnnouncer.setAttribute("aria-live", "polite");
    document.body.appendChild(surpriseAnnouncer);
    surpriseMeButton.addEventListener("click", () => {
      const keys = [...latestEntryLookup.keys()];
      if (!keys.length) {
        return;
      }
      const lookupKey = keys[Math.floor(Math.random() * keys.length)];
      const hadActiveFilters = hasActiveFilters(getFilterState());
      if (hadActiveFilters) {
        resetLibraryFilters();
      }
      highlightCardByLookupKey(lookupKey);
      const entry = latestEntryLookup.get(lookupKey);
      if (entry) {
        const trackLabel = trackLabels[latestEntryCategoryLookup.get(lookupKey)] || "";
        surpriseAnnouncer.textContent = `Showing ${entry.Name || "a resource"}${
          trackLabel ? ` in ${trackLabel}` : ""
        }.`;
      }
    });
  }

  const readingListExportButton = document.getElementById("reading-list-export");
  const readingListImportButton = document.getElementById("reading-list-import");
  const readingListImportInput = document.getElementById("reading-list-import-input");
  const readingListIoFeedback = document.getElementById("reading-list-io-feedback");

  const showReadingListIoFeedback = (message) => {
    if (!readingListIoFeedback) {
      return;
    }
    readingListIoFeedback.textContent = message;
    readingListIoFeedback.hidden = false;
    window.setTimeout(() => {
      readingListIoFeedback.hidden = true;
    }, 5000);
  };

  if (readingListExportButton) {
    readingListExportButton.addEventListener("click", () => {
      const recordCount = Object.keys(readingListState).length;
      const ratingCount = Object.keys(ratingsState).length;
      if (!recordCount && !ratingCount) {
        showReadingListIoFeedback("No saved or rated resources to export yet.");
        return;
      }
      const payload = JSON.stringify(
        {
          version: 2,
          exportedAt: new Date().toISOString(),
          records: readingListState,
          ratings: ratingsState,
        },
        null,
        2
      );
      const blob = new Blob([payload], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = "ai-safety-reading-list.json";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
      const exportedParts = [];
      if (recordCount) {
        exportedParts.push(`${recordCount} saved resource${recordCount === 1 ? "" : "s"}`);
      }
      if (ratingCount) {
        exportedParts.push(`${ratingCount} rating${ratingCount === 1 ? "" : "s"}`);
      }
      showReadingListIoFeedback(`Exported ${exportedParts.join(" and ")}.`);
    });
  }

  if (readingListImportButton && readingListImportInput) {
    readingListImportButton.addEventListener("click", () => {
      readingListImportInput.click();
    });
    readingListImportInput.addEventListener("change", () => {
      const file = readingListImportInput.files && readingListImportInput.files[0];
      readingListImportInput.value = "";
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          const incomingRecords =
            parsed && typeof parsed === "object" && parsed.records && typeof parsed.records === "object"
              ? parsed.records
              : parsed && typeof parsed === "object" && !parsed.ratings
                ? parsed
                : null;
          const incomingRatings =
            parsed && typeof parsed === "object" && parsed.ratings && typeof parsed.ratings === "object"
              ? parsed.ratings
              : null;
          if (!incomingRecords && !incomingRatings) {
            throw new Error("Invalid reading list file.");
          }
          const nextState = { ...readingListState };
          let importedCount = 0;
          Object.entries(incomingRecords || {}).forEach(([lookupKey, record]) => {
            if (!lookupKey || !record || typeof record !== "object") {
              return;
            }
            nextState[lookupKey] = normalizeReadingListRecord(lookupKey, record);
            importedCount += 1;
          });
          const nextRatingsState = { ...ratingsState };
          let importedRatingCount = 0;
          Object.entries(incomingRatings || {}).forEach(([lookupKey, record]) => {
            if (!lookupKey) {
              return;
            }
            const normalizedRecord = normalizeRatingRecord(record);
            if (normalizedRecord) {
              nextRatingsState[lookupKey] = normalizedRecord;
              importedRatingCount += 1;
            }
          });
          if (!importedCount && !importedRatingCount) {
            throw new Error("No valid records found.");
          }
          readingListState = nextState;
          persistReadingListState();
          ratingsState = nextRatingsState;
          persistRatingsState();
          Object.keys(nextState).forEach((lookupKey) => {
            syncReadingRecordToRenderedCards(lookupKey);
          });
          Object.keys(nextRatingsState).forEach((lookupKey) => {
            syncRatingToRenderedCards(lookupKey);
          });
          renderReadingDashboard();
          const importedParts = [];
          if (importedCount) {
            importedParts.push(
              `${importedCount} saved resource${importedCount === 1 ? "" : "s"}`
            );
          }
          if (importedRatingCount) {
            importedParts.push(
              `${importedRatingCount} rating${importedRatingCount === 1 ? "" : "s"}`
            );
          }
          showReadingListIoFeedback(`Imported ${importedParts.join(" and ")}.`);
        } catch (error) {
          logResilienceWarning("reading_list_import_failed", {}, error);
          showReadingListIoFeedback(
            "Could not import that file — make sure it's a reading list exported from this site."
          );
        }
      };
      reader.readAsText(file);
    });
  }

  renderAllBooks();
  applyResourceHighlightFromHash();
});
