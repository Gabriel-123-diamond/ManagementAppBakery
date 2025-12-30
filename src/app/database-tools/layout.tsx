
export default function DatabaseToolsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="w-full min-h-screen bg-muted/40 p-4 flex justify-center">
             <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
            <div className="w-full max-w-4xl py-8">
                {children}
            </div>
        </div>
    )
}
