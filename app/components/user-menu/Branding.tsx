import Image from "next/image";

const Branding = () => {
  return (
    <div className="h-16 px-3 flex items-top">
      <Image
        src="/kaapi-logo.png"
        alt="Kaapi Konsole logo"
        width={801}
        height={311}
        className="h-12 w-auto"
        priority
      />
    </div>
  );
};

export default Branding;
