import Image from "next/image";

const Branding = () => {
  return (
    <div className="h-16 px-6 flex items-center border-b border-border">
      <Image
        src="/kaapi-logo.png"
        alt="Kaapi"
        width={801}
        height={311}
        className="h-10 w-auto"
        priority
      />
    </div>
  );
};

export default Branding;
