interface MolecularBackgroundProps {
  children: React.ReactNode;
}

// Benzene ring wireframe
const BenzeneRing = ({ index }: { index: number }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 120 120"
    className="animate-pulse text-red-500"
    style={{
      animationDuration: `${3 + index * 0.5}s`,
    }}
  >
    {/* Hexagonal ring */}
    <polygon
      points="60,20 85,35 85,65 60,80 35,65 35,35"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="opacity-80"
    />
    {/* Atoms */}
    <circle cx="60" cy="20" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="85" cy="35" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="85" cy="65" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="60" cy="80" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="35" cy="65" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="35" cy="35" r="3" fill="currentColor" className="opacity-90" />
    {/* Double bonds */}
    <line x1="70" y1="27" x2="78" y2="38" stroke="currentColor" strokeWidth="1" className="opacity-60" />
    <line x1="78" y1="62" x2="70" y2="73" stroke="currentColor" strokeWidth="1" className="opacity-60" />
    <line x1="42" y1="73" x2="50" y2="62" stroke="currentColor" strokeWidth="1" className="opacity-60" />
  </svg>
);

// Carbon chain wireframe
const CarbonChain = ({ index }: { index: number }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 120 120"
    className="animate-pulse text-red-500"
    style={{
      animationDuration: `${3.5 + index * 0.5}s`,
    }}
  >
    {/* Zigzag carbon chain */}
    <polyline
      points="20,60 35,40 50,60 65,40 80,60 95,40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="opacity-80"
    />
    {/* Carbon atoms */}
    <circle cx="20" cy="60" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="35" cy="40" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="50" cy="60" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="65" cy="40" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="80" cy="60" r="3" fill="currentColor" className="opacity-90" />
    <circle cx="95" cy="40" r="3" fill="currentColor" className="opacity-90" />
    {/* Side chains */}
    <line x1="35" y1="40" x2="35" y2="25" stroke="currentColor" strokeWidth="1.5" className="opacity-70" />
    <line x1="65" y1="40" x2="65" y2="25" stroke="currentColor" strokeWidth="1.5" className="opacity-70" />
    <circle cx="35" cy="25" r="2" fill="currentColor" className="opacity-80" />
    <circle cx="65" cy="25" r="2" fill="currentColor" className="opacity-80" />
  </svg>
);

// Methane-like molecule
const MethaneStructure = ({ index }: { index: number }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 120 120"
    className="animate-pulse text-red-500"
    style={{
      animationDuration: `${4 + index * 0.5}s`,
    }}
  >
    {/* Central carbon */}
    <circle cx="60" cy="60" r="4" fill="currentColor" className="opacity-90" />
    {/* Bonds to hydrogens */}
    <line x1="60" y1="60" x2="60" y2="30" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    <line x1="60" y1="60" x2="85" y2="75" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    <line x1="60" y1="60" x2="35" y2="75" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    <line x1="60" y1="60" x2="60" y2="90" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    {/* Hydrogen atoms */}
    <circle cx="60" cy="30" r="2.5" fill="currentColor" className="opacity-80" />
    <circle cx="85" cy="75" r="2.5" fill="currentColor" className="opacity-80" />
    <circle cx="35" cy="75" r="2.5" fill="currentColor" className="opacity-80" />
    <circle cx="60" cy="90" r="2.5" fill="currentColor" className="opacity-80" />
  </svg>
);

// Ethylene-like double bond
const EthyleneStructure = ({ index }: { index: number }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 120 120"
    className="animate-pulse text-red-500"
    style={{
      animationDuration: `${2.5 + index * 0.5}s`,
    }}
  >
    {/* Double bond */}
    <line x1="40" y1="55" x2="80" y2="55" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    <line x1="40" y1="65" x2="80" y2="65" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    {/* Carbon atoms */}
    <circle cx="40" cy="60" r="3.5" fill="currentColor" className="opacity-90" />
    <circle cx="80" cy="60" r="3.5" fill="currentColor" className="opacity-90" />
    {/* Hydrogen bonds */}
    <line x1="40" y1="60" x2="25" y2="45" stroke="currentColor" strokeWidth="1.5" className="opacity-70" />
    <line x1="40" y1="60" x2="25" y2="75" stroke="currentColor" strokeWidth="1.5" className="opacity-70" />
    <line x1="80" y1="60" x2="95" y2="45" stroke="currentColor" strokeWidth="1.5" className="opacity-70" />
    <line x1="80" y1="60" x2="95" y2="75" stroke="currentColor" strokeWidth="1.5" className="opacity-70" />
    {/* Hydrogens */}
    <circle cx="25" cy="45" r="2" fill="currentColor" className="opacity-80" />
    <circle cx="25" cy="75" r="2" fill="currentColor" className="opacity-80" />
    <circle cx="95" cy="45" r="2" fill="currentColor" className="opacity-80" />
    <circle cx="95" cy="75" r="2" fill="currentColor" className="opacity-80" />
  </svg>
);

// Water molecule
const WaterMolecule = ({ index }: { index: number }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 120 120"
    className="animate-pulse text-red-500"
    style={{
      animationDuration: `${3.2 + index * 0.5}s`,
    }}
  >
    {/* Oxygen */}
    <circle cx="60" cy="60" r="5" fill="currentColor" className="opacity-90" />
    {/* Bonds to hydrogens */}
    <line x1="60" y1="60" x2="40" y2="40" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    <line x1="60" y1="60" x2="80" y2="40" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    {/* Hydrogens */}
    <circle cx="40" cy="40" r="2.5" fill="currentColor" className="opacity-80" />
    <circle cx="80" cy="40" r="2.5" fill="currentColor" className="opacity-80" />
  </svg>
);

export function MolecularBackground({
  children,
}: MolecularBackgroundProps) {
  // Define toy molecules with styling
  const toyMolecules = [
    { type: 'benzene', component: BenzeneRing, name: 'Benzene Ring' },
    { type: 'chain', component: CarbonChain, name: 'Carbon Chain' },
    { type: 'methane', component: MethaneStructure, name: 'Methane' },
    { type: 'ethylene', component: EthyleneStructure, name: 'Ethylene' },
    { type: 'water', component: WaterMolecule, name: 'Water' },
    { type: 'benzene2', component: BenzeneRing, name: 'Benzene Ring 2' },
    { type: 'chain2', component: CarbonChain, name: 'Carbon Chain 2' },
    { type: 'methane2', component: MethaneStructure, name: 'Methane 2' },
  ];

  const moleculesWithStyling = toyMolecules.map((molecule, index) => ({
    ...molecule,
    rotation: [
      "rotate-12", "-rotate-6", "rotate-45", "-rotate-12", 
      "rotate-30", "-rotate-45", "rotate-60", "-rotate-30"
    ][index % 8],
    scale: [
      "scale-150", "scale-125", "scale-175", "scale-140", 
      "scale-160", "scale-130", "scale-180", "scale-145"
    ][index % 8],
    opacity: [
      "opacity-30", "opacity-25", "opacity-35", "opacity-28", 
      "opacity-32", "opacity-26", "opacity-38", "opacity-29"
    ][index % 8],
    position: {
      top: [15, 65, 25, 75, 45, 5, 85, 55][index % 8] + '%',
      left: [10, 70, 85, 30, 60, 15, 45, 80][index % 8] + '%',
    },
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Molecular background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated floating molecules */}
        <div className="animate-blob absolute -left-20 -top-20 h-96 w-96 rounded-full bg-red-100 opacity-40 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-2000 absolute -right-20 -top-20 h-96 w-96 rounded-full bg-rose-100 opacity-40 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-4000 absolute -bottom-20 left-20 h-96 w-96 rounded-full bg-pink-100 opacity-40 mix-blend-multiply blur-xl filter"></div>

        {/* Molecular structure overlays */}
        <div className="absolute inset-0">
          {moleculesWithStyling.map((molecule, index) => {
            const MoleculeComponent = molecule.component;
            return (
              <div
                key={molecule.name}
                className={`absolute ${molecule.rotation} ${molecule.scale} ${molecule.opacity} transition-all duration-1000`}
                style={{
                  top: molecule.position.top,
                  left: molecule.position.left,
                  animationDelay: `${index * 0.5}s`,
                }}
              >
                {/* Toy molecule wireframe */}
                <div className="relative h-32 w-32 md:h-40 md:w-40 lg:h-48 lg:w-48">
                  <MoleculeComponent index={index} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      {/* Glassy overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>

      {/* Content overlay with glassmorphism effect */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        {children}
      </div>
    </div>
  );
}
