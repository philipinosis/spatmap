/* SpatMap tub art — semi-realistic cast-iron clawfoot tub on a fringed gold cloth.
   Authored readably here, then minified into spatmap-v3.html.
   CONTRACT: widget viewBox 0 0 120 110, class="bargeSvg"; pile in <g id="oysterPile">
   with .pileBack/.pileMid/.pileFront, drawn around anchor (60,64). gradient ids unique. */

/* ───────── LOADED widget ───────── */
window.__LOADED__ = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" width="120" height="110" class="bargeSvg">
 <defs>
  <linearGradient id="tubl_en" x1="0" y1="0" x2="1" y2="0.35">
   <stop offset="0" stop-color="#FCFBF7"/><stop offset="0.5" stop-color="#EDEAE2"/><stop offset="1" stop-color="#D4D0C5"/>
  </linearGradient>
  <radialGradient id="tubl_bas" cx="0.5" cy="0.32" r="0.75">
   <stop offset="0" stop-color="#cfcabd"/><stop offset="1" stop-color="#aaa394"/>
  </radialGradient>
  <linearGradient id="tubl_cl" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#E8B65E"/><stop offset="0.55" stop-color="#CC8A2C"/><stop offset="1" stop-color="#A86A18"/>
  </linearGradient>
  <linearGradient id="tubl_ft" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#8E7E66"/><stop offset="1" stop-color="#574A3A"/>
  </linearGradient>
 </defs>
 <!-- hint of gold cloth under the tub -->
 <path d="M 16 90 Q 60 84 104 90 L 102 103 Q 60 109 18 103 Z" fill="url(#tubl_cl)" opacity="0.92"/>
 <path d="M 18 91 Q 60 86 102 91" fill="none" stroke="#F2CC7C" stroke-width="1" opacity="0.6"/>
 <g stroke="#90591A" stroke-width="0.8" opacity="0.55" stroke-linecap="round">
  <line x1="24" y1="103" x2="23.5" y2="106"/><line x1="36" y1="104" x2="36" y2="107"/><line x1="48" y1="104.6" x2="48" y2="107.6"/>
  <line x1="60" y1="104.8" x2="60" y2="107.8"/><line x1="72" y1="104.6" x2="72" y2="107.6"/><line x1="84" y1="104" x2="84.4" y2="107"/><line x1="96" y1="103" x2="96.5" y2="106"/>
 </g>
 <!-- contact shadow -->
 <ellipse cx="60" cy="99" rx="42" ry="4.4" fill="#000000" opacity="0.16"/>
 <!-- ornate ball-and-claw feet (drawn behind body so the leg tucks under the belly) -->
 <g>
  <!-- far feet peeking at the same corners (depth) -->
  <g fill="#483C2C"><ellipse cx="40" cy="89" rx="3.2" ry="3.8"/><ellipse cx="80" cy="89" rx="3.2" ry="3.8"/></g>
  <!-- front-left claw foot -->
  <path d="M 30 78 C 23 82 22 90 27 93 L 39 93 C 35 88 37 80 41 77 Z" fill="url(#tubl_ft)"/>
  <path d="M 31 79 C 26 83 26 89 29 92" fill="none" stroke="#A8997F" stroke-width="0.9" opacity="0.6"/>
  <ellipse cx="32" cy="95" rx="6.4" ry="5.2" fill="url(#tubl_ft)"/>
  <ellipse cx="29.5" cy="93" rx="2.1" ry="1.4" fill="#AC9D82" opacity="0.7"/>
  <path d="M 28 91 Q 26 97 29 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 32 90.5 Q 32 97 32 100.5" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 37 91 Q 39 97 35 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <!-- front-right claw foot -->
  <path d="M 90 78 C 97 82 98 90 93 93 L 81 93 C 85 88 83 80 79 77 Z" fill="url(#tubl_ft)"/>
  <path d="M 89 79 C 94 83 94 89 91 92" fill="none" stroke="#A8997F" stroke-width="0.9" opacity="0.6"/>
  <ellipse cx="88" cy="95" rx="6.4" ry="5.2" fill="url(#tubl_ft)"/>
  <ellipse cx="85.5" cy="93" rx="2.1" ry="1.4" fill="#AC9D82" opacity="0.7"/>
  <path d="M 84 91 Q 82 97 85 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 88 90.5 Q 88 97 88 100.5" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 93 91 Q 95 97 91 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
 </g>
 <!-- tub body (deeper, lifted on the legs) -->
 <path d="M 16 48 C 12 62 16 76 30 82 Q 60 92 90 82 C 104 76 108 62 104 48 A 44 12 0 0 1 16 48 Z" fill="url(#tubl_en)"/>
 <!-- body shading -->
 <path d="M 22 53 C 18 64 21 76 32 81 L 39 79 C 28 74 25 64 29 54 Z" fill="#FFFFFF" opacity="0.34"/>
 <path d="M 100 52 C 104 64 101 76 88 81 L 81 79 C 92 74 95 64 91 54 Z" fill="#9C958A" opacity="0.30"/>
 <path d="M 30 82 Q 60 91 90 82" fill="none" stroke="#B7B0A2" stroke-width="0.8" opacity="0.5"/>
 <!-- enamel chips + hairline -->
 <circle cx="34" cy="74" r="1.1" fill="#8a8478"/><circle cx="82" cy="70" r="0.9" fill="#7e786c"/><circle cx="53" cy="85" r="0.7" fill="#8a8478"/>
 <path d="M 71 58 Q 73 66 71 74" fill="none" stroke="#bdb7ab" stroke-width="0.4" opacity="0.5"/>
 <!-- rolled rim -->
 <ellipse cx="60" cy="48" rx="44" ry="12" fill="#F4F2EC" stroke="#C9C3B4" stroke-width="1"/>
 <ellipse cx="60" cy="46.8" rx="41.5" ry="10" fill="none" stroke="#FFFFFF" stroke-width="0.9" opacity="0.7"/>
 <ellipse cx="60" cy="49" rx="36" ry="9" fill="url(#tubl_bas)"/>
 <ellipse cx="60" cy="49" rx="36" ry="9" fill="none" stroke="#A39C8C" stroke-width="0.8"/>
 <!-- back inner wall shadow -->
 <path d="M 30 47 Q 60 40.5 90 47 Q 60 53 30 47 Z" fill="#968E7E" opacity="0.5"/>
 <!-- oyster pile (natural shell) -->
 <g id="oysterPile">
  <g class="pileBack">
   <ellipse cx="52" cy="50" rx="5.4" ry="2.6" fill="#a99e8a" transform="rotate(-14 52 50)"/>
   <ellipse cx="60" cy="48" rx="5.8" ry="2.7" fill="#c8bda8" transform="rotate(6 60 48)"/>
   <ellipse cx="68" cy="50" rx="5.2" ry="2.6" fill="#b7ac97" transform="rotate(-9 68 50)"/>
   <ellipse cx="56" cy="52" rx="5.2" ry="2.6" fill="#beb39e" transform="rotate(10 56 52)"/>
   <ellipse cx="64" cy="52" rx="5" ry="2.5" fill="#a99e8a" transform="rotate(-6 64 52)"/>
   <path d="M 55 49 Q 60 47.6 65 49" fill="none" stroke="#ece3d0" stroke-width="0.7" opacity="0.7"/>
  </g>
  <g class="pileMid">
   <ellipse cx="46" cy="56" rx="5.8" ry="2.9" fill="#b7ac97" transform="rotate(-18 46 56)"/>
   <ellipse cx="54" cy="54" rx="6.2" ry="3" fill="#d3c9b4" transform="rotate(7 54 54)"/>
   <ellipse cx="63" cy="54" rx="6" ry="2.9" fill="#c8bda8" transform="rotate(-5 63 54)"/>
   <ellipse cx="71" cy="56" rx="5.4" ry="2.7" fill="#a99e8a" transform="rotate(15 71 56)"/>
   <ellipse cx="59" cy="57" rx="6.2" ry="3" fill="#cabfa9" transform="rotate(3 59 57)"/>
   <ellipse cx="50" cy="58" rx="5" ry="2.5" fill="#b0a591" transform="rotate(-22 50 58)"/>
   <path d="M 50 54.6 Q 56 53 62 54.4" fill="none" stroke="#ece3d0" stroke-width="0.8" opacity="0.65"/>
   <path d="M 50 55.4 Q 55 56.8 60 55.4" fill="none" stroke="#6f6757" stroke-width="0.5" opacity="0.4"/>
  </g>
  <g class="pileFront">
   <ellipse cx="44" cy="62" rx="5.4" ry="2.9" fill="#cabfa9" transform="rotate(-22 44 62)"/>
   <ellipse cx="51" cy="60" rx="6.4" ry="3.2" fill="#d3c9b4" transform="rotate(8 51 60)"/>
   <ellipse cx="60" cy="59" rx="6.7" ry="3.3" fill="#e0d6c0" transform="rotate(-4 60 59)"/>
   <ellipse cx="69" cy="60" rx="6.2" ry="3.1" fill="#cabfa9" transform="rotate(14 69 60)"/>
   <ellipse cx="76" cy="62" rx="5.2" ry="2.8" fill="#b7ac97" transform="rotate(-16 76 62)"/>
   <ellipse cx="48" cy="64" rx="4.6" ry="2.3" fill="#beb39e" transform="rotate(-12 48 64)"/>
   <ellipse cx="56" cy="65" rx="4.7" ry="2.4" fill="#d3c9b4" transform="rotate(8 56 65)"/>
   <ellipse cx="64" cy="65" rx="4.7" ry="2.4" fill="#c8bda8" transform="rotate(-6 64 65)"/>
   <ellipse cx="72" cy="64" rx="4.2" ry="2.2" fill="#a99e8a" transform="rotate(18 72 64)"/>
   <path d="M 46 61 Q 51 59.4 56 60.6" fill="none" stroke="#efe6d2" stroke-width="0.9" opacity="0.75"/>
   <path d="M 60 58.6 Q 65 57.8 70 59.4" fill="none" stroke="#efe6d2" stroke-width="0.8" opacity="0.6"/>
   <path d="M 48 60.6 Q 51 62 54 60.6" fill="none" stroke="#6f6757" stroke-width="0.5" opacity="0.45"/>
   <path d="M 40 65 Q 60 67.4 80 65" fill="none" stroke="#6f6757" stroke-width="0.6" opacity="0.32"/>
  </g>
 </g>
 <!-- front rim lip crosses in front of the pile base -->
 <path d="M 24 49 Q 60 60 96 49" fill="none" stroke="#EFEDE6" stroke-width="1.4" opacity="0.85"/>
</svg>`;

/* ───────── EMPTY widget ───────── */
window.__EMPTY__ = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" width="120" height="110" class="bargeSvg">
 <defs>
  <linearGradient id="tube_en" x1="0" y1="0" x2="1" y2="0.35">
   <stop offset="0" stop-color="#FCFBF7"/><stop offset="0.5" stop-color="#EDEAE2"/><stop offset="1" stop-color="#D4D0C5"/>
  </linearGradient>
  <radialGradient id="tube_bas" cx="0.5" cy="0.32" r="0.75">
   <stop offset="0" stop-color="#d3cec2"/><stop offset="1" stop-color="#aaa394"/>
  </radialGradient>
  <linearGradient id="tube_cl" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#E8B65E"/><stop offset="0.55" stop-color="#CC8A2C"/><stop offset="1" stop-color="#A86A18"/>
  </linearGradient>
  <linearGradient id="tube_ft" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#8E7E66"/><stop offset="1" stop-color="#574A3A"/>
  </linearGradient>
 </defs>
 <path d="M 16 90 Q 60 84 104 90 L 102 103 Q 60 109 18 103 Z" fill="url(#tube_cl)" opacity="0.92"/>
 <path d="M 18 91 Q 60 86 102 91" fill="none" stroke="#F2CC7C" stroke-width="1" opacity="0.6"/>
 <g stroke="#90591A" stroke-width="0.8" opacity="0.55" stroke-linecap="round">
  <line x1="24" y1="103" x2="23.5" y2="106"/><line x1="36" y1="104" x2="36" y2="107"/><line x1="48" y1="104.6" x2="48" y2="107.6"/>
  <line x1="60" y1="104.8" x2="60" y2="107.8"/><line x1="72" y1="104.6" x2="72" y2="107.6"/><line x1="84" y1="104" x2="84.4" y2="107"/><line x1="96" y1="103" x2="96.5" y2="106"/>
 </g>
 <ellipse cx="60" cy="99" rx="42" ry="4.4" fill="#000000" opacity="0.16"/>
 <g>
  <g fill="#483C2C"><ellipse cx="40" cy="89" rx="3.2" ry="3.8"/><ellipse cx="80" cy="89" rx="3.2" ry="3.8"/></g>
  <path d="M 30 78 C 23 82 22 90 27 93 L 39 93 C 35 88 37 80 41 77 Z" fill="url(#tube_ft)"/>
  <path d="M 31 79 C 26 83 26 89 29 92" fill="none" stroke="#A8997F" stroke-width="0.9" opacity="0.6"/>
  <ellipse cx="32" cy="95" rx="6.4" ry="5.2" fill="url(#tube_ft)"/>
  <ellipse cx="29.5" cy="93" rx="2.1" ry="1.4" fill="#AC9D82" opacity="0.7"/>
  <path d="M 28 91 Q 26 97 29 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 32 90.5 Q 32 97 32 100.5" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 37 91 Q 39 97 35 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 90 78 C 97 82 98 90 93 93 L 81 93 C 85 88 83 80 79 77 Z" fill="url(#tube_ft)"/>
  <path d="M 89 79 C 94 83 94 89 91 92" fill="none" stroke="#A8997F" stroke-width="0.9" opacity="0.6"/>
  <ellipse cx="88" cy="95" rx="6.4" ry="5.2" fill="url(#tube_ft)"/>
  <ellipse cx="85.5" cy="93" rx="2.1" ry="1.4" fill="#AC9D82" opacity="0.7"/>
  <path d="M 84 91 Q 82 97 85 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 88 90.5 Q 88 97 88 100.5" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
  <path d="M 93 91 Q 95 97 91 100" fill="none" stroke="#3E3324" stroke-width="2" stroke-linecap="round"/>
 </g>
 <path d="M 16 48 C 12 62 16 76 30 82 Q 60 92 90 82 C 104 76 108 62 104 48 A 44 12 0 0 1 16 48 Z" fill="url(#tube_en)"/>
 <path d="M 22 53 C 18 64 21 76 32 81 L 39 79 C 28 74 25 64 29 54 Z" fill="#FFFFFF" opacity="0.34"/>
 <path d="M 100 52 C 104 64 101 76 88 81 L 81 79 C 92 74 95 64 91 54 Z" fill="#9C958A" opacity="0.30"/>
 <circle cx="34" cy="74" r="1.1" fill="#8a8478"/><circle cx="82" cy="70" r="0.9" fill="#7e786c"/>
 <path d="M 71 58 Q 73 66 71 74" fill="none" stroke="#bdb7ab" stroke-width="0.4" opacity="0.5"/>
 <ellipse cx="60" cy="48" rx="44" ry="12" fill="#F4F2EC" stroke="#C9C3B4" stroke-width="1"/>
 <ellipse cx="60" cy="46.8" rx="41.5" ry="10" fill="none" stroke="#FFFFFF" stroke-width="0.9" opacity="0.7"/>
 <ellipse cx="60" cy="49" rx="36" ry="9" fill="url(#tube_bas)"/>
 <ellipse cx="60" cy="49" rx="36" ry="9" fill="none" stroke="#A39C8C" stroke-width="0.8"/>
 <path d="M 30 47 Q 60 40.5 90 47 Q 60 53 30 47 Z" fill="#968E7E" opacity="0.45"/>
 <!-- shallow water sheen + a couple leftover shells in the empty basin -->
 <ellipse cx="58" cy="51.5" rx="22" ry="4.2" fill="#DDEAEC" opacity="0.55"/>
 <ellipse cx="52" cy="51" rx="9" ry="2.4" fill="#FFFFFF" opacity="0.45"/>
 <ellipse cx="50" cy="52" rx="4" ry="1.9" fill="#b7ac97" transform="rotate(-16 50 52)" opacity="0.92"/>
 <path d="M 47 52.3 Q 50 53.4 53 52.3" fill="none" stroke="#6f6757" stroke-width="0.5" opacity="0.5"/>
 <ellipse cx="68" cy="51.4" rx="3.4" ry="1.6" fill="#c8bda8" transform="rotate(12 68 51.4)" opacity="0.9"/>
 <path d="M 24 49 Q 60 60 96 49" fill="none" stroke="#EFEDE6" stroke-width="1.4" opacity="0.85"/>
</svg>`;

/* ───────── HERO banner ───────── */
window.__HERO__ = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 150" width="320" height="150" class="harvestHeroSvg">
 <defs>
  <linearGradient id="tubh_bg" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#FBF7EF"/><stop offset="1" stop-color="#EFE7D6"/>
  </linearGradient>
  <linearGradient id="tubh_en" x1="0" y1="0" x2="1" y2="0.4">
   <stop offset="0" stop-color="#FDFCF9"/><stop offset="0.5" stop-color="#EEEBE3"/><stop offset="1" stop-color="#D4D0C5"/>
  </linearGradient>
  <radialGradient id="tubh_bas" cx="0.5" cy="0.3" r="0.8">
   <stop offset="0" stop-color="#cfcabd"/><stop offset="1" stop-color="#a8a192"/>
  </radialGradient>
  <linearGradient id="tubh_cl" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#EBBA62"/><stop offset="0.5" stop-color="#CE8C2E"/><stop offset="1" stop-color="#A0641A"/>
  </linearGradient>
  <linearGradient id="tubh_ft" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#90805F"/><stop offset="1" stop-color="#544632"/>
  </linearGradient>
 </defs>
 <rect x="0" y="0" width="320" height="150" fill="url(#tubh_bg)"/>
 <!-- table cloth, fully draped + fringe -->
 <path d="M 14 99 Q 160 101 306 99 L 300 146 Q 160 153 20 146 Z" fill="url(#tubh_cl)"/>
 <path d="M 18 100 Q 160 102 302 100" fill="none" stroke="#F4CE7E" stroke-width="1.6" opacity="0.6"/>
 <g stroke="#8C5616" stroke-width="1" opacity="0.4" fill="none">
  <path d="M 70 104 Q 68 124 66 142"/><path d="M 120 105 Q 119 125 118 144"/><path d="M 200 105 Q 201 125 202 144"/><path d="M 250 104 Q 252 124 254 142"/>
 </g>
 <rect x="22" y="139" width="276" height="4" fill="#E8C074" opacity="0.5"/>
 <g stroke="#8C5616" stroke-width="1.2" stroke-linecap="round" opacity="0.85">
  <line x1="30" y1="143" x2="29" y2="150"/><line x1="44" y1="143.6" x2="43.6" y2="150.6"/><line x1="58" y1="144" x2="58" y2="151"/><line x1="72" y1="144.4" x2="72" y2="151.4"/>
  <line x1="86" y1="144.7" x2="86.2" y2="151.7"/><line x1="100" y1="145" x2="100" y2="152"/><line x1="114" y1="145.2" x2="114" y2="152.2"/><line x1="128" y1="145.3" x2="128" y2="152.3"/>
  <line x1="142" y1="145.4" x2="142" y2="152.4"/><line x1="156" y1="145.5" x2="156" y2="152.5"/><line x1="170" y1="145.5" x2="170" y2="152.5"/><line x1="184" y1="145.4" x2="184" y2="152.4"/>
  <line x1="198" y1="145.3" x2="198" y2="152.3"/><line x1="212" y1="145.2" x2="212.2" y2="152.2"/><line x1="226" y1="145" x2="226.2" y2="152"/><line x1="240" y1="144.7" x2="240.4" y2="151.7"/>
  <line x1="254" y1="144.4" x2="254.4" y2="151.4"/><line x1="268" y1="144" x2="268.4" y2="151"/><line x1="282" y1="143.6" x2="282.6" y2="150.6"/><line x1="292" y1="143" x2="293" y2="150"/>
 </g>
 <!-- contact shadow on cloth -->
 <ellipse cx="160" cy="122" rx="78" ry="7" fill="#000000" opacity="0.14"/>
 <!-- ornate ball-and-claw feet (behind body) -->
 <g>
  <g fill="#443824"><ellipse cx="112" cy="116" rx="5" ry="5.6"/><ellipse cx="208" cy="116" rx="5" ry="5.6"/></g>
  <!-- front-left -->
  <path d="M 92 110 C 80 116 78 130 87 135 L 109 135 C 101 126 105 112 113 108 Z" fill="url(#tubh_ft)"/>
  <path d="M 94 112 C 85 118 84 128 90 133" fill="none" stroke="#A8997F" stroke-width="1.3" opacity="0.55"/>
  <ellipse cx="96" cy="138" rx="10.5" ry="8.5" fill="url(#tubh_ft)"/>
  <ellipse cx="91" cy="134" rx="3.4" ry="2.2" fill="#AC9D82" opacity="0.7"/>
  <path d="M 87 130 Q 84 138 88 143" fill="none" stroke="#352B1D" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M 96 129 Q 96 138 96 144" fill="none" stroke="#352B1D" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M 105 130 Q 108 138 104 143" fill="none" stroke="#352B1D" stroke-width="3.2" stroke-linecap="round"/>
  <!-- front-right -->
  <path d="M 228 110 C 240 116 242 130 233 135 L 211 135 C 219 126 215 112 207 108 Z" fill="url(#tubh_ft)"/>
  <path d="M 226 112 C 235 118 236 128 230 133" fill="none" stroke="#A8997F" stroke-width="1.3" opacity="0.55"/>
  <ellipse cx="224" cy="138" rx="10.5" ry="8.5" fill="url(#tubh_ft)"/>
  <ellipse cx="219" cy="134" rx="3.4" ry="2.2" fill="#AC9D82" opacity="0.7"/>
  <path d="M 215 130 Q 212 138 216 143" fill="none" stroke="#352B1D" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M 224 129 Q 224 138 224 144" fill="none" stroke="#352B1D" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M 233 130 Q 236 138 232 143" fill="none" stroke="#352B1D" stroke-width="3.2" stroke-linecap="round"/>
 </g>
 <!-- tub body (deeper, flatter belly, lifted on the legs) -->
 <path d="M 92 54 C 84 80 96 110 118 116 Q 160 121 202 116 C 224 110 236 80 228 54 A 68 16 0 0 1 92 54 Z" fill="url(#tubh_en)"/>
 <path d="M 100 62 C 92 84 98 106 118 113 L 130 111 C 108 104 104 84 110 64 Z" fill="#FFFFFF" opacity="0.30"/>
 <path d="M 220 62 C 228 84 222 106 202 113 L 190 111 C 212 104 216 84 210 64 Z" fill="#9C958A" opacity="0.28"/>
 <path d="M 118 116 Q 160 120 202 116" fill="none" stroke="#B7B0A2" stroke-width="1.1" opacity="0.5"/>
 <circle cx="100" cy="92" r="1.8" fill="#8a8478"/><circle cx="222" cy="86" r="1.5" fill="#7e786c"/><circle cx="150" cy="111" r="1.2" fill="#8a8478"/>
 <path d="M 198 66 Q 202 88 198 108" fill="none" stroke="#bdb7ab" stroke-width="0.6" opacity="0.5"/>
 <!-- rolled rim -->
 <ellipse cx="160" cy="54" rx="68" ry="16" fill="#F5F3ED" stroke="#C9C3B4" stroke-width="1.4"/>
 <ellipse cx="160" cy="52" rx="64" ry="13.5" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>
 <ellipse cx="160" cy="55.5" rx="56" ry="12.5" fill="url(#tubh_bas)"/>
 <ellipse cx="160" cy="55.5" rx="56" ry="12.5" fill="none" stroke="#A39C8C" stroke-width="1.1"/>
 <path d="M 108 53 Q 160 42 212 53 Q 160 63 108 53 Z" fill="#968E7E" opacity="0.5"/>
 <!-- a wire shucking basket resting in the tub (back-left) -->
 <g transform="translate(124 50)" opacity="0.9">
  <ellipse cx="0" cy="0" rx="16" ry="6" fill="#cfd6d2" opacity="0.5" stroke="#7d8a86" stroke-width="0.8"/>
  <g stroke="#7d8a86" stroke-width="0.5" opacity="0.7" fill="none">
   <line x1="-12" y1="-2.5" x2="-12" y2="4"/><line x1="-6" y1="-4" x2="-6" y2="5.5"/><line x1="0" y1="-4.5" x2="0" y2="6"/><line x1="6" y1="-4" x2="6" y2="5.5"/><line x1="12" y1="-2.5" x2="12" y2="4"/>
   <path d="M -15 0 Q 0 4 15 0"/><path d="M -13 3 Q 0 7 13 3"/>
  </g>
 </g>
 <!-- oyster pile heaped in the tub (natural shell, static) -->
 <g id="oysterPile">
  <g class="pileBack">
   <ellipse cx="140" cy="50" rx="11" ry="5" fill="#a99e8a" transform="rotate(-13 140 50)"/>
   <ellipse cx="158" cy="46" rx="12" ry="5.2" fill="#c8bda8" transform="rotate(6 158 46)"/>
   <ellipse cx="176" cy="49" rx="11" ry="5" fill="#b7ac97" transform="rotate(-9 176 49)"/>
   <ellipse cx="150" cy="53" rx="11" ry="5" fill="#beb39e" transform="rotate(10 150 53)"/>
   <ellipse cx="168" cy="53" rx="10.4" ry="4.8" fill="#a99e8a" transform="rotate(-6 168 53)"/>
   <path d="M 146 48 Q 158 45 170 48" fill="none" stroke="#ece3d0" stroke-width="1" opacity="0.7"/>
  </g>
  <g class="pileMid">
   <ellipse cx="128" cy="60" rx="11.6" ry="5.4" fill="#b7ac97" transform="rotate(-18 128 60)"/>
   <ellipse cx="146" cy="56" rx="12.4" ry="5.6" fill="#d3c9b4" transform="rotate(7 146 56)"/>
   <ellipse cx="164" cy="56" rx="12" ry="5.4" fill="#c8bda8" transform="rotate(-5 164 56)"/>
   <ellipse cx="182" cy="60" rx="11" ry="5.2" fill="#a99e8a" transform="rotate(15 182 60)"/>
   <ellipse cx="158" cy="62" rx="12.6" ry="5.6" fill="#cabfa9" transform="rotate(3 158 62)"/>
   <ellipse cx="136" cy="63" rx="10" ry="4.8" fill="#b0a591" transform="rotate(-22 136 63)"/>
   <path d="M 134 56.6 Q 146 53.6 158 56.4" fill="none" stroke="#ece3d0" stroke-width="1.1" opacity="0.65"/>
   <path d="M 134 58.4 Q 144 61 154 58.4" fill="none" stroke="#6f6757" stroke-width="0.7" opacity="0.4"/>
  </g>
  <g class="pileFront">
   <ellipse cx="120" cy="70" rx="11" ry="5.4" fill="#cabfa9" transform="rotate(-22 120 70)"/>
   <ellipse cx="138" cy="66" rx="12.8" ry="6" fill="#d3c9b4" transform="rotate(8 138 66)"/>
   <ellipse cx="160" cy="64" rx="13.4" ry="6.2" fill="#e0d6c0" transform="rotate(-4 160 64)"/>
   <ellipse cx="182" cy="66" rx="12.4" ry="6" fill="#cabfa9" transform="rotate(14 182 66)"/>
   <ellipse cx="200" cy="70" rx="10.4" ry="5.2" fill="#b7ac97" transform="rotate(-16 200 70)"/>
   <ellipse cx="128" cy="74" rx="9" ry="4.4" fill="#beb39e" transform="rotate(-12 128 74)"/>
   <ellipse cx="146" cy="76" rx="9.4" ry="4.6" fill="#d3c9b4" transform="rotate(8 146 76)"/>
   <ellipse cx="166" cy="76" rx="9.4" ry="4.6" fill="#c8bda8" transform="rotate(-6 166 76)"/>
   <ellipse cx="186" cy="74" rx="8.4" ry="4.2" fill="#a99e8a" transform="rotate(18 186 74)"/>
   <path d="M 124 68 Q 138 65 152 67" fill="none" stroke="#efe6d2" stroke-width="1.2" opacity="0.75"/>
   <path d="M 162 63 Q 176 61 190 64" fill="none" stroke="#efe6d2" stroke-width="1.1" opacity="0.6"/>
   <path d="M 128 67 Q 134 70 140 67" fill="none" stroke="#6f6757" stroke-width="0.6" opacity="0.45"/>
   <path d="M 108 77 Q 160 81 212 77" fill="none" stroke="#6f6757" stroke-width="0.8" opacity="0.32"/>
  </g>
 </g>
 <path d="M 100 58 Q 160 74 220 58" fill="none" stroke="#EFEDE6" stroke-width="2" opacity="0.85"/>
 <!-- still-life props on the cloth -->
 <!-- halved lemon, front-left -->
 <g transform="translate(56 124)">
  <ellipse cx="0" cy="0" rx="9" ry="7.5" fill="#F2D24E"/>
  <ellipse cx="0" cy="-0.5" rx="7" ry="5.8" fill="#FBEC9A"/>
  <g stroke="#E8D26A" stroke-width="0.7" opacity="0.8"><line x1="0" y1="-5" x2="0" y2="5"/><line x1="-5" y1="-3" x2="5" y2="3"/><line x1="-5" y1="3" x2="5" y2="-3"/></g>
  <ellipse cx="0" cy="0" rx="2" ry="1.6" fill="#FFFBE0"/>
  <ellipse cx="3" cy="6.5" rx="9" ry="2.2" fill="#000000" opacity="0.1"/>
 </g>
 <!-- oyster knife, front-right -->
 <g transform="translate(232 128) rotate(-18)">
  <rect x="0" y="-2.6" width="20" height="5.2" rx="2.4" fill="#7A5A3A"/>
  <rect x="1.5" y="-1.6" width="16" height="1" rx="0.5" fill="#9A7A52" opacity="0.7"/>
  <path d="M 20 -2 L 36 -1 Q 39 0 36 1 L 20 2 Z" fill="#C8CDD2"/>
  <path d="M 20 -1.4 L 35 -0.6" stroke="#EEF1F4" stroke-width="0.7" opacity="0.8"/>
  <ellipse cx="20" cy="6" rx="20" ry="2.4" fill="#000000" opacity="0.1"/>
 </g>
 <!-- a couple of loose shucked shells -->
 <g transform="translate(96 132)">
  <ellipse cx="0" cy="0" rx="7" ry="4" fill="#d3c9b4" transform="rotate(-14)"/>
  <ellipse cx="0" cy="-0.4" rx="4.6" ry="2.4" fill="#bdb09a" transform="rotate(-14)"/>
  <path d="M -5 0.5 Q 0 2 5 0.5" fill="none" stroke="#6f6757" stroke-width="0.5" opacity="0.5"/>
 </g>
 <g transform="translate(204 134)">
  <ellipse cx="0" cy="0" rx="6.4" ry="3.6" fill="#c8bda8" transform="rotate(12)"/>
  <ellipse cx="0" cy="-0.3" rx="4" ry="2.1" fill="#b0a591" transform="rotate(12)"/>
 </g>
</svg>`;
