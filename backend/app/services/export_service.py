"""Generate a GPX track file from an itinerary.

GPX 1.1 — uses only stdlib xml.etree.ElementTree, no extra dependencies.
The output is a waypoint-per-stop file (wpt) that any GPS app can import.
"""
import xml.etree.ElementTree as ET
from datetime import UTC, datetime

from app.schemas.itinerary import Itinerary


def _indent(elem: ET.Element, level: int = 0) -> None:
    """Pretty-print helper (ET doesn't do this automatically in 3.8)."""
    pad = "\n" + "  " * level
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = pad + "  "
        if not elem.tail or not elem.tail.strip():
            elem.tail = pad
        for child in elem:
            _indent(child, level + 1)
        if not child.tail or not child.tail.strip():  # noqa: F821
            child.tail = pad  # noqa: F821
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = pad


def generate_gpx(itinerary: Itinerary) -> str:
    """Return a GPX 1.1 XML string for the given itinerary."""
    gpx = ET.Element(
        "gpx",
        attrib={
            "version": "1.1",
            "creator": "ODYSSEIO",
            "xmlns": "http://www.topografix.com/GPX/1/1",
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "xsi:schemaLocation": (
                "http://www.topografix.com/GPX/1/1 "
                "http://www.topografix.com/GPX/1/1/gpx.xsd"
            ),
        },
    )

    # Metadata
    meta = ET.SubElement(gpx, "metadata")
    ET.SubElement(meta, "name").text = itinerary.title
    ET.SubElement(meta, "desc").text = (
        f"ODYSSEIO itinerary for {itinerary.city} on {itinerary.date}. "
        f"Pace: {itinerary.pace}, Transport: {itinerary.transport}."
    )
    ET.SubElement(meta, "time").text = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    # One waypoint per stop
    for stop in itinerary.stops:
        p = stop.place
        wpt = ET.SubElement(
            gpx,
            "wpt",
            attrib={
                "lat": str(p.coordinates.lat),
                "lon": str(p.coordinates.lng),
            },
        )
        ET.SubElement(wpt, "name").text = p.name
        ET.SubElement(wpt, "desc").text = (
            f"Arrive {stop.arrivalTime} | Depart {stop.departureTime} | "
            f"{p.category} | {p.address}"
        )
        ET.SubElement(wpt, "sym").text = "Waypoint"
        ET.SubElement(wpt, "type").text = p.category

    # Route (rte) — ordered list of stops as route points
    rte = ET.SubElement(gpx, "rte")
    ET.SubElement(rte, "name").text = itinerary.title
    for stop in itinerary.stops:
        p = stop.place
        rtept = ET.SubElement(
            rte,
            "rtept",
            attrib={
                "lat": str(p.coordinates.lat),
                "lon": str(p.coordinates.lng),
            },
        )
        ET.SubElement(rtept, "name").text = p.name
        ET.SubElement(rtept, "desc").text = f"Arrive {stop.arrivalTime}"

    _indent(gpx)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(gpx, encoding="unicode")
