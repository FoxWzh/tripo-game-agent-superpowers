package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	exe, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "cannot resolve executable path: %v\n", err)
		os.Exit(1)
	}

	script := filepath.Join(filepath.Dir(exe), "tripo-agent.sh")
	args := append([]string{script}, os.Args[1:]...)
	cmd := exec.Command("/bin/bash", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		fmt.Fprintf(os.Stderr, "failed to run tripo-agent script: %v\n", err)
		os.Exit(1)
	}
}
