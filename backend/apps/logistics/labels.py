from decimal import Decimal, InvalidOperation
from html import escape

from django.utils import timezone

PAPER_LAYOUTS = {
    "a4": {
        "label": "A4",
        "screen_max_width": "1000px",
        "screen_padding": "16px",
        "print_size": "A4",
        "print_margin": "10mm",
    },
    "4x6": {
        "label": "4x6 Thermal",
        "screen_max_width": "4.25in",
        "screen_padding": "0.12in",
        "print_size": "4in 6in",
        "print_margin": "0.12in",
    },
}

THERMAL_4X6_OVERRIDES = """
          .paper-4x6 .header {
            flex-direction: column;
            gap: 8px;
          }
          .paper-4x6 .title {
            font-size: 18px;
          }
          .paper-4x6 .title.compact {
            font-size: 16px;
          }
          .paper-4x6 .subtitle {
            font-size: 11px;
          }
          .paper-4x6 .summary-meta-grid,
          .paper-4x6 .address-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }
          .paper-4x6 .summary-meta-grid,
          .paper-4x6 .address-card p {
            font-size: 11px;
          }
          .paper-4x6 .address-card {
            min-height: 0;
            padding: 8px;
          }
          .paper-4x6 .address-card h3 {
            font-size: 11px;
          }
          .paper-4x6 .section-title {
            font-size: 12px;
          }
          .paper-4x6 .package-table {
            font-size: 10px;
          }
          .paper-4x6 .package-table th,
          .paper-4x6 .package-table td {
            padding: 4px;
          }
"""


def _as_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _safe(value, fallback="-"):
    text = _as_text(value)
    return escape(text) if text else escape(fallback)


def _safe_lines(values):
    lines = []
    for value in values:
        text = _as_text(value)
        if text:
            lines.append(escape(text))
    return lines or [escape("Not available")]


def _format_decimal(value, suffix=""):
    if value in (None, ""):
        return "-"
    try:
        normalized = Decimal(value)
        return f"{normalized:.2f}{suffix}"
    except (InvalidOperation, TypeError, ValueError):
        return f"{_as_text(value)}{suffix}".strip() or "-"


def _format_dimensions(package):
    length = _format_decimal(package.package_dimension_length)
    breadth = _format_decimal(package.package_dimension_breadth)
    height = _format_decimal(package.package_dimension_height)
    if "-" in {length, breadth, height}:
        return "-"
    return f"{length} x {breadth} x {height}"


def _address_lines(address, user, include_landmark_last=False):
    city_line = ", ".join(
        [
            part
            for part in [
                _as_text(getattr(address, "town_city", "")),
                _as_text(getattr(address, "state_region", "")),
                _as_text(getattr(address, "pincode", "")),
            ]
            if part
        ]
    )
    landmark = _as_text(getattr(address, "landmark", ""))
    mobile_number = _as_text(getattr(address, "mobile_num", ""))
    door_number = _as_text(getattr(address, "building_name", ""))
    street_name = _as_text(getattr(address, "area_sector", ""))

    if door_number and street_name:
        door_street_line = f"Door No: {door_number}, Street: {street_name}"
    elif door_number:
        door_street_line = f"Door No: {door_number}"
    elif street_name:
        door_street_line = f"Street: {street_name}"
    else:
        door_street_line = ""

    lines = [
        getattr(address, "full_name", "") or getattr(user, "full_name", ""),
        getattr(address, "company_name", ""),
        door_street_line,
        city_line,
    ]

    if include_landmark_last and landmark:
        lines.append(f"Landmark: {landmark}")
    if mobile_number:
        lines.append(f"Mobile: {mobile_number}")

    return _safe_lines(lines)


def _render_block_lines(lines):
    return "<br/>".join(lines)


def _render_summary_table_rows(packages):
    rows = []
    for index, package in enumerate(packages, start=1):
        rows.append(
            f"""
            <tr>
              <td>{index}</td>
              <td>{_safe(package.id)}</td>
              <td>{_safe(package.package_name)}</td>
              <td>{_safe(package.package_description)}</td>
              <td>{_safe(_format_decimal(package.weight_per_package))}</td>
              <td>{_safe(_format_dimensions(package))}</td>
            </tr>
            """
        )

    if not rows:
        rows.append(
            """
            <tr>
              <td colspan="6">No packages linked to this pickup request.</td>
            </tr>
            """
        )
    return "".join(rows)


def _render_summary_page(pickup, packages):
    from_lines = _address_lines(pickup.from_address, pickup.from_user)
    to_lines = _address_lines(pickup.to_address, pickup.to_user, include_landmark_last=True)
    generated_on = timezone.localtime(timezone.now()).strftime("%d %b %Y, %I:%M %p")
    total_weight = _format_decimal(
        sum([(package.weight_per_package or Decimal("0")) for package in packages])
    )

    return f"""
    <section class="page summary-page">
      <header class="header">
        <div>
          <h1 class="title">PutForShare</h1>
          <p class="subtitle">Shipment Summary Label</p>
        </div>
        <div class="pickup-req-id">
          Pickup Req #: {_safe(pickup.id)}
        </div>
      </header>

      <div class="summary-meta-grid">
        <div><strong>Scheduled Date:</strong> {_safe(pickup.pickup_scheduled_date)}</div>
        <div><strong>No. of Packages:</strong> {_safe(len(packages))}</div>
        <div><strong>Total Weight (kg):</strong> {_safe(total_weight)}</div>
        <div><strong>Pickup Mode:</strong> {_safe(pickup.pickup_mode)}</div>
        <div><strong>Instruction:</strong> {_safe(pickup.pickup_instruction, fallback="N/A")}</div>
        <div><strong>Generated:</strong> {_safe(generated_on)}</div>
      </div>

      <div class="address-grid">
        <div class="address-card ship-to">
          <h3>SHIP TO</h3>
          <p>{_render_block_lines(to_lines)}</p>
        </div>
        <div class="address-card ship-from">
          <h3>Ship From</h3>
          <p>{_render_block_lines(from_lines)}</p>
        </div>
      </div>

      <h3 class="section-title">Packages in this Pickup</h3>
      <table class="package-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>Package Name</th>
            <th>Description</th>
            <th>Weight (kg)</th>
            <th>Dimensions (LxBxH) CM</th>
          </tr>
        </thead>
        <tbody>
          {_render_summary_table_rows(packages)}
        </tbody>
      </table>
    </section>
    """


def _render_package_page(pickup, package, sequence_number, total_packages):
    from_lines = _address_lines(pickup.from_address, pickup.from_user)
    to_lines = _address_lines(pickup.to_address, pickup.to_user, include_landmark_last=True)

    return f"""
    <section class="page individual-page">
      <header class="header compact">
        <div>
          <h2 class="title compact">PutForShare Shipping Label</h2>
          <p class="subtitle">Package {sequence_number} of {total_packages}</p>
        </div>
        <div class="pickup-req-id">
          Pickup Req #: {_safe(pickup.id)}
        </div>
      </header>

      <div class="address-grid">
        <div class="address-card ship-to">
          <h3>SHIP TO</h3>
          <p>{_render_block_lines(to_lines)}</p>
        </div>
        <div class="address-card ship-from">
          <h3>Ship From</h3>
          <p>{_render_block_lines(from_lines)}</p>
        </div>
      </div>

      <h3 class="section-title">Package Details</h3>
      <table class="package-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>Package Name</th>
            <th>Description</th>
            <th>Weight (kg)</th>
            <th>Dimensions (LxBxH) CM</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{_safe(sequence_number)}</td>
            <td>{_safe(package.id)}</td>
            <td>{_safe(package.package_name)}</td>
            <td>{_safe(package.package_description)}</td>
            <td>{_safe(_format_decimal(package.weight_per_package))}</td>
            <td>{_safe(_format_dimensions(package))}</td>
          </tr>
        </tbody>
      </table>

    </section>
    """


def _normalize_paper_size(paper_size):
    value = _as_text(paper_size).lower().replace(" ", "")
    aliases = {
        "4x6in": "4x6",
        "4inx6in": "4x6",
        "thermal": "4x6",
        "thermal4x6": "4x6",
    }
    normalized = aliases.get(value, value)
    if normalized in PAPER_LAYOUTS:
        return normalized
    return "a4"


def render_shipping_labels_html(pickup, packages, label_type="all", paper_size="a4"):
    normalized_paper_size = _normalize_paper_size(paper_size)
    layout = PAPER_LAYOUTS[normalized_paper_size]
    thermal_overrides = THERMAL_4X6_OVERRIDES if normalized_paper_size == "4x6" else ""
    print_hint = f'{layout["label"]} format. Summary sheet is included first, followed by package labels.'

    sections = []
    if label_type in {"all", "summary"}:
        sections.append(_render_summary_page(pickup, packages))

    if label_type in {"all", "individual"}:
        total_packages = len(packages)
        for index, package in enumerate(packages, start=1):
            sections.append(
                _render_package_page(
                    pickup=pickup,
                    package=package,
                    sequence_number=index,
                    total_packages=total_packages,
                )
            )

    return f"""
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pickup {pickup.id} Shipping Labels ({layout["label"]})</title>
        <style>
          :root {{
            --ink: #111827;
            --muted: #4b5563;
            --brand: #0a4a47;
            --line: #1f2937;
            --soft: #e5e7eb;
          }}
          * {{
            box-sizing: border-box;
          }}
          body {{
            margin: 0;
            background: #f3f4f6;
            color: var(--ink);
            font-family: Arial, Helvetica, sans-serif;
          }}
          .controls {{
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
            padding: 12px;
            background: #ffffff;
            border-bottom: 1px solid var(--soft);
          }}
          .controls button {{
            border: 0;
            background: var(--brand);
            color: white;
            padding: 8px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
          }}
          .controls .hint {{
            font-size: 12px;
            color: var(--muted);
          }}
          .page {{
            width: min({layout["screen_max_width"]}, calc(100% - 24px));
            margin: 12px auto;
            padding: {layout["screen_padding"]};
            background: white;
            border: 1.5px solid var(--line);
            page-break-after: always;
          }}
          .page:last-child {{
            page-break-after: auto;
          }}
          .header {{
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 2px solid var(--line);
            padding-bottom: 10px;
            margin-bottom: 12px;
          }}
          .title {{
            margin: 0;
            color: var(--brand);
            font-size: 26px;
            font-weight: 800;
            line-height: 1.1;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }}
          .title.compact {{
            font-size: 21px;
          }}
          .subtitle {{
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 13px;
          }}
          .pickup-req-id {{
            margin-left: auto;
            align-self: flex-start;
            font-size: 16px;
            font-weight: 800;
            color: #111827;
            text-align: right;
            white-space: nowrap;
          }}
          .summary-meta-grid {{
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px 14px;
            font-size: 13px;
            margin-bottom: 12px;
          }}
          .address-grid {{
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }}
          .address-card {{
            padding: 10px;
            min-height: 140px;
          }}
          .address-card h3 {{
            margin: 0 0 6px;
            font-size: 13px;
            text-transform: uppercase;
            color: var(--muted);
          }}
          .address-card.ship-to {{
            border: 0;
          }}
          .address-card.ship-to h3 {{
            font-size: 17px;
            font-weight: 900;
            color: #0a4a47;
            letter-spacing: 0.5px;
          }}
          .address-card.ship-to p {{
            font-size: 15px;
            font-weight: 700;
            color: #111827;
          }}
          .address-card.ship-from {{
            margin-left: 40%;
            width: 60%;
          }}
          .address-card p {{
            margin: 0;
            font-size: 13px;
            line-height: 1.45;
            word-break: break-word;
          }}
          .section-title {{
            margin: 10px 0 6px;
            font-size: 14px;
            text-transform: uppercase;
            color: var(--muted);
          }}
          .package-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }}
          .package-table th,
          .package-table td {{
            border: 1px solid var(--line);
            padding: 6px;
            vertical-align: top;
            text-align: left;
          }}
          .package-table th {{
            background: #f8fafc;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }}
          @media (max-width: 800px) {{
            .summary-meta-grid,
            .address-grid {{
              grid-template-columns: 1fr;
            }}
          }}
          @media print {{
            @page {{
              size: {layout["print_size"]};
              margin: {layout["print_margin"]};
            }}
            body {{
              background: white;
            }}
            .no-print {{
              display: none !important;
            }}
            .page {{
              width: 100%;
              border-width: 1px;
              margin: 0 0 8px 0;
            }}
          }}
          {thermal_overrides}
        </style>
      </head>
      <body class="paper-{normalized_paper_size}">
        <div class="controls no-print">
          <button type="button" onclick="window.print()">Print Labels</button>
          <span class="hint">
            {print_hint}
          </span>
        </div>
        {"".join(sections)}
      </body>
    </html>
    """
