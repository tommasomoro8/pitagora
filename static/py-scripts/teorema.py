import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from matplotlib.widgets import Slider

# Valori iniziali
AB0 = 6
AC0 = 4

# Figura: sinistra disegno, destra formule
fig = plt.figure(figsize=(12, 7))
ax = fig.add_axes([0.06, 0.25, 0.55, 0.65])       # area disegno
ax_info = fig.add_axes([0.67, 0.25, 0.28, 0.65])  # area formule
ax_info.axis("off")

ax.set_aspect("equal")


def draw(ab, ac):
    ax.clear()
    ax_info.clear()
    ax_info.axis("off")

    # Punti del triangolo rettangolo
    A = np.array([0.0, 0.0])
    B = np.array([ab, 0.0])
    C = np.array([0.0, ac])

    # Ipotenusa
    BC = C - B
    bc = np.linalg.norm(BC)

    # Limiti grafico
    margin = 2
    ax.set_xlim(-ac - margin, ab + ac + margin + 2)
    ax.set_ylim(-ab - margin, ac + ab + margin)
    ax.set_aspect("equal")
    ax.grid(True, alpha=0.3)

    # Triangolo
    triangle = Polygon(
        [A, B, C],
        closed=True,
        facecolor="orange",
        edgecolor="black",
        alpha=0.7
    )
    ax.add_patch(triangle)

    # Quadrato su AB
    square_ab = Polygon(
        [A, B, B + np.array([0.0, -ab]), A + np.array([0.0, -ab])],
        closed=True,
        facecolor="magenta",
        edgecolor="black",
        alpha=0.45
    )
    ax.add_patch(square_ab)

    # Quadrato su AC
    square_ac = Polygon(
        [A, C, C + np.array([-ac, 0.0]), A + np.array([-ac, 0.0])],
        closed=True,
        facecolor="green",
        edgecolor="black",
        alpha=0.45
    )
    ax.add_patch(square_ac)

    # Quadrato su BC
    perp_unit = np.array([BC[1], -BC[0]]) / bc
    offset = perp_unit * bc

    D = B + offset
    E = C + offset

    square_bc = Polygon(
        [B, C, E, D],
        closed=True,
        facecolor="purple",
        edgecolor="black",
        alpha=0.45
    )
    ax.add_patch(square_bc)

    # Etichette vertici
    ax.text(A[0], A[1], "  A", fontsize=11)
    ax.text(B[0], B[1], "  B", fontsize=11)
    ax.text(C[0], C[1], "  C", fontsize=11)

    # Etichette lati
    ax.text(ab / 2, -0.5, "AB", ha="center", fontsize=11)
    ax.text(-0.5, ac / 2, "AC", va="center", ha="right", fontsize=11)
    ax.text((B[0] + C[0]) / 2 + 0.5, (B[1] + C[1]) / 2, "BC", fontsize=11)

    # Calcoli
    area_triangolo = (ab * ac) / 2
    area_ab = ab ** 2
    area_ac = ac ** 2
    area_bc = bc ** 2

    # Titolo
    ax.set_title("Teorema di Pitagora interattivo", fontsize=14)

    # Pannello formule
    testo = (
        f"DATI INSERITI\n"
        f"AB = {ab:.2f}\n"
        f"AC = {ac:.2f}\n"
        f"BC = √(AB² + AC²) = {bc:.2f}\n\n"
        f"FORMULE\n"
        f"AB² = {ab:.2f}² = {area_ab:.2f}\n"
        f"AC² = {ac:.2f}² = {area_ac:.2f}\n"
        f"BC² = {bc:.2f}² = {area_bc:.2f}\n\n"
        f"TEOREMA DI PITAGORA\n"
        f"AB² + AC² = BC²\n"
        f"{area_ab:.2f} + {area_ac:.2f} = {area_bc:.2f}\n"
        f"{area_ab + area_ac:.2f} = {area_bc:.2f}\n\n"
        f"AREA DEL TRIANGOLO\n"
        f"A = (AB × AC) / 2\n"
        f"A = ({ab:.2f} × {ac:.2f}) / 2\n"
        f"A = {area_triangolo:.2f}"
    )

    ax_info.text(
        0.02, 0.98, testo,
        transform=ax_info.transAxes,
        va="top",
        ha="left",
        fontsize=12,
        bbox=dict(boxstyle="round", facecolor="#f5f5f5", edgecolor="gray")
    )


# Disegno iniziale
draw(AB0, AC0)

# Slider
ax_ab = fig.add_axes([0.10, 0.12, 0.45, 0.03])
ax_ac = fig.add_axes([0.10, 0.06, 0.45, 0.03])

slider_ab = Slider(ax_ab, "AB", 1, 10, valinit=AB0, valstep=0.1)
slider_ac = Slider(ax_ac, "AC", 1, 10, valinit=AC0, valstep=0.1)


def update(val):
    draw(slider_ab.val, slider_ac.val)
    fig.canvas.draw_idle()


slider_ab.on_changed(update)
slider_ac.on_changed(update)

plt.show()