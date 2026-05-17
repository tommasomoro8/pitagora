import tkinter as tk
from tkinter import ttk


BG = "#f4efe2"
PANEL = "#fbf7ef"
INK = "#1e1b16"
MUTED = "#675d4f"
GOLD = "#b8872b"
GOLD_SOFT = "#e3c88d"
TERRACOTTA = "#a14f3d"
SAGE = "#6d7d5f"
LINE = "#c4b28d"


class TetraktysApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Simulatore della Tetraktys")
        self.root.configure(bg=BG)
        self.root.minsize(1180, 760)

        self.points = [
            {"id": 1, "x": 320, "y": 80, "row": 1},
            {"id": 2, "x": 270, "y": 170, "row": 2},
            {"id": 3, "x": 370, "y": 170, "row": 2},
            {"id": 4, "x": 220, "y": 260, "row": 3},
            {"id": 5, "x": 320, "y": 260, "row": 3},
            {"id": 6, "x": 420, "y": 260, "row": 3},
            {"id": 7, "x": 170, "y": 350, "row": 4},
            {"id": 8, "x": 270, "y": 350, "row": 4},
            {"id": 9, "x": 370, "y": 350, "row": 4},
            {"id": 10, "x": 470, "y": 350, "row": 4},
        ]
        self.lines = [
            (1, 7), (1, 10), (7, 10),
            (2, 3), (4, 5), (5, 6), (7, 8), (8, 9), (9, 10),
            (2, 4), (4, 7), (3, 6), (6, 10), (2, 5), (5, 9), (3, 5), (5, 8),
        ]
        self.annotations = [
            {"x": 95, "y": 80, "text": "1", "group": "rows"},
            {"x": 95, "y": 170, "text": "2", "group": "rows"},
            {"x": 95, "y": 260, "text": "3", "group": "rows"},
            {"x": 95, "y": 350, "text": "4", "group": "rows"},
            {"x": 545, "y": 80, "text": "1", "group": "triangular"},
            {"x": 545, "y": 170, "text": "3", "group": "triangular"},
            {"x": 545, "y": 260, "text": "6", "group": "triangular"},
            {"x": 545, "y": 350, "text": "10", "group": "triangular"},
        ]
        self.info_by_preset = {
            "selection": (
                "Selezione libera",
                "Clicca i punti per costruire una tua lettura della figura e confrontare sottostrutture.",
            ),
            "sum10": (
                "La decade emerge dai quattro livelli",
                "La tetraktys raccoglie 1, 2, 3 e 4. La loro somma produce 10, numero compiuto della figura.",
            ),
            "triangular": (
                "Numeri triangolari cumulativi",
                "Riga dopo riga ottieni 1, 3, 6, 10: una crescita figurata fondata sull'accumulo.",
            ),
            "rows": (
                "La forma si espande per righe",
                "La figura passa da monade a dualita, triade e tetrade, aggiungendo una unita di ampiezza ogni volta.",
            ),
            "symmetry": (
                "Equilibrio sull'asse centrale",
                "L'asse verticale e le corrispondenze laterali mostrano l'idea pitagorica di armonia e rispecchiamento.",
            ),
            "pairs": (
                "Bordo e nucleo",
                "Le coppie laterali e il centro fanno emergere il rapporto fra esterno, interno e stabilita della forma.",
            ),
        }

        self.point_items = {}
        self.line_items = []
        self.annotation_items = []
        self.selected = set()
        self.visible_count = 0
        self.active_preset = "selection"

        self.visible_var = tk.IntVar(value=0)
        self.build_count_var = tk.StringVar(value="0/10")
        self.insight_title_var = tk.StringVar(value="Inizia la costruzione")
        self.insight_text_var = tk.StringVar(
            value="Muovi il cursore o premi i pulsanti per far emergere la struttura della tetraktys."
        )
        self.selected_count_var = tk.StringVar(value="0")
        self.selected_sum_var = tk.StringVar(value="0+0+0+0=0")
        self.selected_rows_var = tk.StringVar(value="nessuna")

        self._build_style()
        self._build_layout()
        self._draw_scene()
        self._set_visible_count(0)

    def _build_style(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Panel.TFrame", background=PANEL)
        style.configure("Root.TFrame", background=BG)
        style.configure("Panel.TLabel", background=PANEL, foreground=INK)
        style.configure("Muted.TLabel", background=PANEL, foreground=MUTED)
        style.configure("Title.TLabel", background=BG, foreground=INK, font=("Georgia", 28, "bold"))
        style.configure("Hero.TLabel", background=BG, foreground=MUTED, font=("Helvetica", 11))
        style.configure("BlockTitle.TLabel", background=PANEL, foreground=INK, font=("Georgia", 16, "bold"))
        style.configure("StatValue.TLabel", background="#efe6d4", foreground=INK, font=("Helvetica", 13, "bold"))
        style.configure("StatLabel.TLabel", background="#efe6d4", foreground=MUTED, font=("Helvetica", 9))
        style.configure("TScale", background=PANEL)

    def _build_layout(self) -> None:
        root_frame = ttk.Frame(self.root, style="Root.TFrame", padding=20)
        root_frame.pack(fill="both", expand=True)
        root_frame.columnconfigure(0, weight=7)
        root_frame.columnconfigure(1, weight=5)
        root_frame.rowconfigure(1, weight=1)

        hero = ttk.Frame(root_frame, style="Root.TFrame")
        hero.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 14))

        ttk.Label(
            hero,
            text="Geometria pitagorica interattiva",
            style="Hero.TLabel",
        ).pack(anchor="w")
        ttk.Label(hero, text="Simulatore della Tetraktys", style="Title.TLabel").pack(anchor="w", pady=(4, 6))
        ttk.Label(
            hero,
            text=(
                "Costruisci il triangolo sacro punto dopo punto, osserva le righe 1-2-3-4 "
                "e illumina relazioni numeriche, simmetrie e progressioni."
            ),
            style="Hero.TLabel",
            wraplength=900,
            justify="left",
        ).pack(anchor="w")

        canvas_panel = ttk.Frame(root_frame, style="Panel.TFrame", padding=14)
        canvas_panel.grid(row=1, column=0, sticky="nsew", padx=(0, 10))
        canvas_panel.rowconfigure(0, weight=1)
        canvas_panel.columnconfigure(0, weight=1)

        self.canvas = tk.Canvas(
            canvas_panel,
            width=640,
            height=470,
            bg="#fffaf0",
            bd=0,
            highlightthickness=0,
        )
        self.canvas.grid(row=0, column=0, sticky="nsew")

        side = ttk.Frame(root_frame, style="Root.TFrame")
        side.grid(row=1, column=1, sticky="nsew")
        side.columnconfigure(0, weight=1)

        self._make_build_block(side).grid(row=0, column=0, sticky="ew", pady=(0, 10))
        self._make_preset_block(side).grid(row=1, column=0, sticky="ew", pady=(0, 10))
        self._make_insight_block(side).grid(row=2, column=0, sticky="ew", pady=(0, 10))
        self._make_stats_block(side).grid(row=3, column=0, sticky="ew")

    def _make_build_block(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.Frame(parent, style="Panel.TFrame", padding=14)
        ttk.Label(frame, text="Costruzione", style="BlockTitle.TLabel").pack(anchor="w")

        buttons = ttk.Frame(frame, style="Panel.TFrame")
        buttons.pack(fill="x", pady=(10, 10))
        for index in range(3):
            buttons.columnconfigure(index, weight=1)

        tk.Button(
            buttons, text="Azzera", bg=GOLD, fg="white", relief="flat",
            command=self._reset_build, padx=10, pady=10
        ).grid(row=0, column=0, sticky="ew", padx=(0, 6))
        tk.Button(
            buttons, text="Aggiungi punto", bg=TERRACOTTA, fg="white", relief="flat",
            command=self._step_build, padx=10, pady=10
        ).grid(row=0, column=1, sticky="ew", padx=3)
        tk.Button(
            buttons, text="Completa", bg=SAGE, fg="white", relief="flat",
            command=lambda: self._set_visible_count(10), padx=10, pady=10
        ).grid(row=0, column=2, sticky="ew", padx=(6, 0))

        ttk.Label(frame, textvariable=self.build_count_var, style="Muted.TLabel").pack(anchor="w")
        scale = ttk.Scale(
            frame,
            from_=0,
            to=10,
            orient="horizontal",
            variable=self.visible_var,
            command=self._on_scale,
        )
        scale.pack(fill="x", pady=(6, 0))
        return frame

    def _make_preset_block(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.Frame(parent, style="Panel.TFrame", padding=14)
        ttk.Label(frame, text="Relazioni", style="BlockTitle.TLabel").pack(anchor="w")

        grid = ttk.Frame(frame, style="Panel.TFrame")
        grid.pack(fill="x", pady=(10, 0))
        for index in range(2):
            grid.columnconfigure(index, weight=1)

        presets = [
            ("1 + 2 + 3 + 4 = 10", "sum10"),
            ("1, 3, 6, 10", "triangular"),
            ("Righe della figura", "rows"),
            ("Asse di simmetria", "symmetry"),
            ("Coppie esterne/interne", "pairs"),
            ("Solo selezione", "selection"),
        ]

        self.preset_buttons = {}
        for idx, (label, key) in enumerate(presets):
            btn = tk.Button(
                grid,
                text=label,
                bg=SAGE if key != "selection" else GOLD,
                fg="white",
                relief="flat",
                wraplength=150,
                justify="center",
                padx=8,
                pady=10,
                command=lambda preset=key: self._apply_preset(preset),
            )
            btn.grid(row=idx // 2, column=idx % 2, sticky="ew", padx=4, pady=4)
            self.preset_buttons[key] = btn
        return frame

    def _make_insight_block(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.Frame(parent, style="Panel.TFrame", padding=14)
        ttk.Label(frame, text="Lettura attiva", style="BlockTitle.TLabel").pack(anchor="w")
        ttk.Label(
            frame,
            textvariable=self.insight_title_var,
            style="Panel.TLabel",
            font=("Helvetica", 12, "bold"),
            wraplength=360,
            justify="left",
        ).pack(anchor="w", pady=(8, 4))
        ttk.Label(
            frame,
            textvariable=self.insight_text_var,
            style="Muted.TLabel",
            wraplength=360,
            justify="left",
        ).pack(anchor="w")
        return frame

    def _make_stats_block(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.Frame(parent, style="Panel.TFrame", padding=14)
        ttk.Label(frame, text="Selezione", style="BlockTitle.TLabel").pack(anchor="w")
        ttk.Label(
            frame,
            text="Clicca i punti visibili per confrontarli. La formula per righe si aggiorna in tempo reale.",
            style="Muted.TLabel",
            wraplength=360,
            justify="left",
        ).pack(anchor="w", pady=(8, 10))

        stats = ttk.Frame(frame, style="Panel.TFrame")
        stats.pack(fill="x")
        for idx in range(3):
            stats.columnconfigure(idx, weight=1)

        self._make_stat_cell(stats, 0, "Punti selezionati", self.selected_count_var)
        self._make_stat_cell(stats, 1, "Formula per righe", self.selected_sum_var)
        self._make_stat_cell(stats, 2, "Righe coinvolte", self.selected_rows_var)
        return frame

    def _make_stat_cell(self, parent: ttk.Frame, column: int, label: str, variable: tk.StringVar) -> None:
        box = tk.Frame(parent, bg="#efe6d4", padx=10, pady=10)
        box.grid(row=0, column=column, sticky="nsew", padx=4)
        ttk.Label(box, text=label, style="StatLabel.TLabel").pack(anchor="w")
        ttk.Label(box, textvariable=variable, style="StatValue.TLabel").pack(anchor="w", pady=(4, 0))

    def _draw_scene(self) -> None:
        for start_id, end_id in self.lines:
            p1 = self._point_by_id(start_id)
            p2 = self._point_by_id(end_id)
            item = self.canvas.create_line(p1["x"], p1["y"], p2["x"], p2["y"], fill=LINE, width=3)
            self.line_items.append((start_id, end_id, item))

        for entry in self.annotations:
            item = self.canvas.create_text(
                entry["x"], entry["y"], text=entry["text"], fill="#bca784", font=("Georgia", 18, "bold"), state="hidden"
            )
            self.annotation_items.append((entry["group"], item))

        for point in self.points:
            oval = self.canvas.create_oval(
                point["x"] - 24, point["y"] - 24, point["x"] + 24, point["y"] + 24,
                fill="#e7dcc2", outline="#9e865a", width=2, state="hidden"
            )
            label = self.canvas.create_text(
                point["x"], point["y"], text=str(point["id"]), fill="#46351c", font=("Helvetica", 11, "bold"), state="hidden"
            )
            self.point_items[point["id"]] = {"oval": oval, "label": label}
            for item in (oval, label):
                self.canvas.tag_bind(item, "<Button-1>", lambda _event, pid=point["id"]: self._toggle_point(pid))

        self.canvas.create_text(
            320,
            440,
            text="Clic sui punti per selezionare. Slider e pulsanti per costruire. Preset per leggere le relazioni.",
            fill=MUTED,
            font=("Helvetica", 10),
        )

    def _point_by_id(self, point_id: int) -> dict:
        return next(point for point in self.points if point["id"] == point_id)

    def _preset_ids(self, preset: str) -> list[int]:
        if preset in {"sum10", "triangular", "rows"}:
            return [point["id"] for point in self.points]
        if preset == "symmetry":
            return [1, 5, 8, 9]
        if preset == "pairs":
            return [2, 3, 4, 6, 7, 10]
        return []

    def _set_visible_count(self, count: int) -> None:
        self.visible_count = max(0, min(10, count))
        self.visible_var.set(self.visible_count)
        self.build_count_var.set(f"{self.visible_count}/10")

        for point in self.points:
            state = "normal" if point["id"] <= self.visible_count else "hidden"
            self.canvas.itemconfigure(self.point_items[point["id"]]["oval"], state=state)
            self.canvas.itemconfigure(self.point_items[point["id"]]["label"], state=state)
            if point["id"] > self.visible_count:
                self.selected.discard(point["id"])

        self._refresh_stats()
        self._update_build_insight()
        self._refresh_canvas()

    def _refresh_stats(self) -> None:
        visible_selected = [pid for pid in sorted(self.selected) if pid <= self.visible_count]
        row_counts = []
        for row in range(1, 5):
            row_counts.append(sum(1 for pid in visible_selected if self._point_by_id(pid)["row"] == row))

        self.selected_count_var.set(str(len(visible_selected)))
        self.selected_sum_var.set(f"{row_counts[0]}+{row_counts[1]}+{row_counts[2]}+{row_counts[3]}={sum(row_counts)}")

        rows = sorted({self._point_by_id(pid)["row"] for pid in visible_selected})
        self.selected_rows_var.set(", ".join(str(row) for row in rows) if rows else "nessuna")

    def _update_build_insight(self) -> None:
        if self.active_preset != "selection":
            title, text = self.info_by_preset[self.active_preset]
            self.insight_title_var.set(title)
            self.insight_text_var.set(text)
            return

        if self.visible_count == 0:
            self.insight_title_var.set("Inizia la costruzione")
            self.insight_text_var.set(
                "La tetraktys e ancora potenziale: la figura compare seguendo la progressione 1, 2, 3, 4."
            )
        elif self.visible_count == 10:
            self.insight_title_var.set("Tetraktys completa")
            self.insight_text_var.set(
                "Dieci punti raccolgono unita, polarita, triade e tetrade in una sola figura."
            )
        else:
            cumulative = [1, 3, 6, 10]
            row_reached = next(index + 1 for index, value in enumerate(cumulative) if self.visible_count <= value)
            self.insight_title_var.set(f"Figura in crescita: riga {row_reached}")
            self.insight_text_var.set(
                f"Sono visibili {self.visible_count} punti. La costruzione sta attraversando il passaggio verso la riga {row_reached}."
            )

    def _refresh_canvas(self) -> None:
        visible_ids = {point["id"] for point in self.points if point["id"] <= self.visible_count}
        preset_ids = {pid for pid in self._preset_ids(self.active_preset) if pid in visible_ids}
        symmetry_ids = {1, 5, 8, 9} if self.active_preset == "symmetry" else set()

        for point in self.points:
            pid = point["id"]
            fill = "#fbf7ef"
            outline = "#9e865a"
            width = 2

            if pid in preset_ids:
                fill = GOLD_SOFT if self.active_preset != "symmetry" else "#a6b49b"
            if pid in symmetry_ids:
                fill = "#a6b49b"
            if pid in self.selected and pid in visible_ids:
                fill = "#d58d72"
                outline = "#8c4636"
                width = 3

            self.canvas.itemconfigure(self.point_items[pid]["oval"], fill=fill, outline=outline, width=width)

        for start_id, end_id, item in self.line_items:
            if self.active_preset == "selection" or not preset_ids:
                color = LINE
            elif start_id in preset_ids and end_id in preset_ids:
                color = GOLD
            else:
                color = "#e3d7bf"
            self.canvas.itemconfigure(item, fill=color)

        for group, item in self.annotation_items:
            show = (
                (self.active_preset == "sum10" and group == "rows")
                or (self.active_preset == "rows" and group == "rows")
                or (self.active_preset == "triangular" and group == "triangular")
            )
            self.canvas.itemconfigure(item, state="normal" if show else "hidden")

        self._refresh_preset_buttons()

    def _refresh_preset_buttons(self) -> None:
        for key, button in self.preset_buttons.items():
            if key == self.active_preset:
                button.configure(bg=TERRACOTTA)
            elif key == "selection":
                button.configure(bg=GOLD)
            else:
                button.configure(bg=SAGE)

    def _toggle_point(self, point_id: int) -> None:
        if point_id > self.visible_count:
            return
        if point_id in self.selected:
            self.selected.remove(point_id)
        else:
            self.selected.add(point_id)
        self.active_preset = "selection"
        self._refresh_stats()
        self._update_build_insight()
        self._refresh_canvas()

    def _apply_preset(self, preset: str) -> None:
        self.active_preset = preset
        title, text = self.info_by_preset[preset]
        self.insight_title_var.set(title)
        self.insight_text_var.set(text)
        self._refresh_canvas()

    def _step_build(self) -> None:
        self._set_visible_count(self.visible_count + 1)

    def _reset_build(self) -> None:
        self.selected.clear()
        self.active_preset = "selection"
        self._set_visible_count(0)

    def _on_scale(self, value: str) -> None:
        self.active_preset = "selection"
        self._set_visible_count(int(round(float(value))))


def main() -> None:
    root = tk.Tk()
    TetraktysApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()