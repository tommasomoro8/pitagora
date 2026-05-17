"""Simulatore grafico di numerologia pitagorica basato sul nome."""

from __future__ import annotations

import string
import tkinter as tk
import unicodedata
from tkinter import ttk


LETTERE_TO_NUMERI = {
    lettera: (indice % 9) + 1
    for indice, lettera in enumerate(string.ascii_uppercase)
}

SIGNIFICATI = {
    1: "Unita: principio, identita, iniziativa e forza creatrice.",
    2: "Dualita: relazione, equilibrio, ascolto e complementarita.",
    3: "Triade: espressione, creativita, armonia e comunicazione.",
    4: "Ordine: stabilita, struttura, disciplina e concretezza.",
    5: "Mutamento: movimento, liberta, esperienza e curiosita.",
    6: "Armonia: responsabilita, cura, bellezza e senso della comunita.",
    7: "Ricerca: introspezione, sapienza, mistero e contemplazione.",
    8: "Potenza: realizzazione, autorita, materia e volonta.",
    9: "Compimento: universalita, generosita, sintesi e trascendenza.",
}


def normalizza_testo(testo: str) -> str:
    testo = unicodedata.normalize("NFD", testo)
    testo = "".join(car for car in testo if unicodedata.category(car) != "Mn")
    return testo.upper()


def nome_in_numeri(nome: str) -> list[tuple[str, int]]:
    risultato = []
    for carattere in normalizza_testo(nome):
        if carattere in LETTERE_TO_NUMERI:
            risultato.append((carattere, LETTERE_TO_NUMERI[carattere]))
    return risultato


def riduci_numero(numero: int) -> tuple[int, list[int]]:
    passaggi = [numero]
    while numero > 9:
        numero = sum(int(cifra) for cifra in str(numero))
        passaggi.append(numero)
    return numero, passaggi


def interpreta_nome(nome: str) -> str:
    conversione = nome_in_numeri(nome)
    if not conversione:
        return "Nessuna lettera valida trovata. Inserisci almeno un nome alfabetico."

    lettere = " + ".join(f"{lettera}({valore})" for lettera, valore in conversione)
    valori = [valore for _, valore in conversione]
    totale = sum(valori)
    numero_finale, passaggi = riduci_numero(totale)

    righe = [
        f"Nome inserito: {nome}",
        f"Conversione pitagorica: {lettere}",
        f"Somma totale: {' + '.join(map(str, valori))} = {totale}",
    ]

    if len(passaggi) > 1:
        righe.append(
            "Riduzione numerologica: "
            + " -> ".join(str(passaggio) for passaggio in passaggi)
        )

    righe.extend(
        [
            f"Numero simbolico finale: {numero_finale}",
            f"Interpretazione: {SIGNIFICATI[numero_finale]}",
            "",
            "Lettura filosofica:",
            "Questo simulatore propone una lettura simbolica ispirata alla tradizione pitagorica.",
            "Non e uno strumento scientifico, ma un piccolo esercizio interpretativo.",
        ]
    )

    return "\n".join(righe)


class AppNumerologia:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Simulatore di numerologia pitagorica")
        self.root.geometry("760x560")
        self.root.minsize(680, 500)
        self.root.configure(bg="#f3efe6")

        stile = ttk.Style()
        stile.theme_use("clam")
        stile.configure("Card.TFrame", background="#fffaf2")
        stile.configure("Title.TLabel", background="#f3efe6", foreground="#2f2a26")
        stile.configure("Subtitle.TLabel", background="#f3efe6", foreground="#5f574f")
        stile.configure("CardTitle.TLabel", background="#fffaf2", foreground="#2f2a26")
        stile.configure("TLabel", font=("Avenir Next", 12), background="#fffaf2")
        stile.configure("TButton", font=("Avenir Next", 12))
        stile.configure("TEntry", font=("Avenir Next", 13))

        self.nome_var = tk.StringVar()

        contenitore = tk.Frame(self.root, bg="#f3efe6", padx=26, pady=24)
        contenitore.pack(fill="both", expand=True)

        header = tk.Frame(contenitore, bg="#f3efe6")
        header.pack(fill="x", pady=(0, 18))

        ttk.Label(
            header,
            text="Numerologia pitagorica",
            style="Title.TLabel",
            font=("Georgia", 24, "bold"),
        ).pack(anchor="w")
        ttk.Label(
            header,
            text="Inserisci un nome e osserva la sua lettura simbolica in chiave filosofica.",
            style="Subtitle.TLabel",
            font=("Avenir Next", 12),
        ).pack(anchor="w", pady=(6, 0))

        card_input = ttk.Frame(contenitore, style="Card.TFrame", padding=18)
        card_input.pack(fill="x")

        ttk.Label(
            card_input,
            text="Nome da interpretare",
            style="CardTitle.TLabel",
            font=("Avenir Next", 13, "bold"),
        ).pack(anchor="w")

        entry_frame = tk.Frame(card_input, bg="#fffaf2")
        entry_frame.pack(fill="x", pady=(10, 0))

        entry = ttk.Entry(entry_frame, textvariable=self.nome_var)
        entry.pack(side="left", fill="x", expand=True)
        entry.bind("<Return>", self.calcola_evento)
        entry.focus()

        ttk.Button(entry_frame, text="Interpreta", command=self.calcola).pack(
            side="left", padx=(10, 0)
        )
        ttk.Button(entry_frame, text="Pulisci", command=self.pulisci).pack(
            side="left", padx=(10, 0)
        )

        nota = tk.Label(
            card_input,
            text="La numerologia qui proposta e simbolica: suggerisce significati, non risultati scientifici.",
            font=("Avenir Next", 10),
            fg="#6c635b",
            bg="#fffaf2",
            anchor="w",
            justify="left",
        )
        nota.pack(fill="x", pady=(10, 0))

        card_output = ttk.Frame(contenitore, style="Card.TFrame", padding=18)
        card_output.pack(fill="both", expand=True, pady=(18, 0))

        ttk.Label(
            card_output,
            text="Lettura simbolica",
            style="CardTitle.TLabel",
            font=("Avenir Next", 13, "bold"),
        ).pack(anchor="w")

        self.output = tk.Text(
            card_output,
            wrap="word",
            font=("Avenir Next", 13),
            bg="#fffdf8",
            fg="#2d2926",
            relief="flat",
            padx=12,
            pady=12,
            insertbackground="#2d2926",
        )
        self.output.pack(fill="both", expand=True, pady=(10, 0))
        self.output.insert(
            "1.0",
            "Scrivi un nome qui sopra e premi 'Interpreta' per vedere la conversione "
            "in numeri, la riduzione numerologica e il significato filosofico finale.",
        )
        self.output.config(state="disabled")

    def mostra_testo(self, testo: str) -> None:
        self.output.config(state="normal")
        self.output.delete("1.0", tk.END)
        self.output.insert("1.0", testo)
        self.output.config(state="disabled")

    def calcola_evento(self, _event: tk.Event) -> None:
        self.calcola()

    def calcola(self) -> None:
        nome = self.nome_var.get().strip()
        self.mostra_testo(interpreta_nome(nome))

    def pulisci(self) -> None:
        self.nome_var.set("")
        self.mostra_testo(
            "Scrivi un nome qui sopra e premi 'Interpreta' per vedere la conversione "
            "in numeri, la riduzione numerologica e il significato filosofico finale."
        )


if __name__ == "__main__":
    root = tk.Tk()
    app = AppNumerologia(root)
    root.mainloop()