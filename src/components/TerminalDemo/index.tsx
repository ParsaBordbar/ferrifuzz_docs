import React, {useEffect, useState} from "react";
import styles from "./styles.module.css";


export default function TerminalDemo({commands}: {commands: any}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [cmdIndex, setCmdIndex] = useState(0);
  const [typedCmd, setTypedCmd] = useState("");
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const current = commands[cmdIndex];

    if (typedCmd.length < current.cmd.length) {
      const t = setTimeout(() => {
        setTypedCmd(current.cmd.slice(0, typedCmd.length + 1));
      }, 40);
      return () => clearTimeout(t);
    }

    if (lineIndex < current.output.length) {
      const t = setTimeout(() => {
        setLines((l) => [...l, current.output[lineIndex]]);
        setLineIndex(lineIndex + 1);
      }, 200);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setCmdIndex((cmdIndex + 1) % commands.length);
      setTypedCmd("");
      setLines([]);
      setLineIndex(0);
    }, 2000);

    return () => clearTimeout(t);
  }, [typedCmd, lineIndex, cmdIndex]);

  return (
    <div className={styles.terminal}>
      <div className={styles.header}>
        <span className={styles.red}/>
        <span className={styles.yellow}/>
        <span className={styles.green}/>
      </div>

      <div className={styles.body}>
        <div className={styles.command}>
          <span className={styles.prompt}>$ </span>
          {typedCmd}
          <span className={styles.cursor}>█</span>
        </div>

        {lines.map((line, i) => (
          <div key={i} className={styles.line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
