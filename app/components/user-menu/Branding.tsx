import { APP_NAME } from "@/app/lib/constants";

const Branding = () => {
  return (
    <div className="px-5 py-[13px] border-b border-border">
      <h2 className="text-sm font-semibold text-text-primary tracking-tight">
        {APP_NAME}
      </h2>
      <p className="text-xs mt-0.5 text-text-secondary">Tech4Dev</p>
    </div>
  );
};

export default Branding;
