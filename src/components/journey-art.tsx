export function JourneyArt() {
  return (
    <div
      className="absolute inset-y-10 right-0 w-full lg:w-3/5 opacity-50 lg:opacity-80 pointer-events-none"
      aria-hidden="true"
    >
      {" "}
      <svg
        viewBox="0 0 600 330"
        className="w-full relative"
        role="img"
        aria-label="A car beside an abstract city skyline"
      >
        <defs>
          <linearGradient id="car" x2="0" y2="1">
            <stop stopColor="#dfded1" />
            <stop offset="1" stopColor="#a5b6a5" />
          </linearGradient>
        </defs>
        <g stroke="#79958a" fill="none" opacity=".45" strokeWidth="2">
          <path d="M40 230V138h38v92m18 0V85h38v145m30 0V125h42v105m27 0V76h36v154m20 0V25h16v205m0-205 8-22 8 22v205m22 0V110h53v120m20 0V143h35v87m22 0V98h51v132" />
          <path d="M0 231h600" />
        </g>
        <ellipse cx="300" cy="283" rx="240" ry="23" fill="#061f1d" />
        <path d="m80 232 64-21 61-61h165l81 57 66 18 15 44H68Z" fill="url(#car)" />
        <path d="m168 209 49-47h71v47Zm134 0v-47h57l63 47Z" fill="#23483f" />
        <path d="M79 236h66v10H76m400-10h35v10h-30" fill="#f0ddac" />
        <path d="M171 222h238m-133-6h22m39 0h22" stroke="#758f83" strokeWidth="3" />
        <circle cx="169" cy="267" r="32" fill="#0d2320" />
        <circle cx="169" cy="267" r="17" fill="#81958b" />
        <circle cx="440" cy="267" r="32" fill="#0d2320" />
        <circle cx="440" cy="267" r="17" fill="#81958b" />
        <path d="M70 276h460" stroke="#81958b" />
      </svg>
    </div>
  );
}
