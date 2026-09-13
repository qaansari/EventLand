import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="CCCCCC", sz="4", val="single"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:left w:val="none"/>\n'
            f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:right w:val="none"/>\n'
            f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:insideV w:val="none"/>\n'
            f'</w:tblBorders>'
        )
        tblPr[0].append(borders)

def add_callout(doc, text, title="NOTE:", bg_hex="F0F4F8", border_hex="1E3A8A"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Left border only
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="none"/>\n'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>\n'
        f'  <w:bottom w:val="none"/>\n'
        f'  <w:right w:val="none"/>\n'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    
    run_title = p.add_run(f"{title} ")
    run_title.bold = True
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(10.5)
    run_title.font.color.rgb = RGBColor(30, 58, 138) if border_hex=="1E3A8A" else RGBColor(180, 83, 9)
    
    run_text = p.add_run(text)
    run_text.font.name = 'Calibri'
    run_text.font.size = Pt(10.5)
    run_text.font.color.rgb = RGBColor(31, 41, 55)
    
    # Empty line after table for spacing
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(6)

def build_document():
    doc = docx.Document()
    
    # Set page margins (1 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Styles setup
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(51, 65, 85) # Slate 700

    # Colors
    PRIMARY = RGBColor(30, 27, 75)     # Deep Indigo (#1E1B4B)
    SECONDARY = RGBColor(15, 118, 110) # Teal (#0F766E)
    DARK_TEXT = RGBColor(15, 23, 42)   # Slate 900

    # -------------------------------------------------------------
    # DOCUMENT TITLE / HEADER BLOCK
    # -------------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("EVENTLAND PLATFORM")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(28)
    run_title.font.bold = True
    run_title.font.color.rgb = PRIMARY

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(18)
    run_sub = sub_p.add_run("End-to-End Testing Guide & Step-by-Step QA Manual (From Scratch)")
    run_sub.font.name = 'Calibri'
    run_sub.font.size = Pt(16)
    run_sub.font.bold = True
    run_sub.font.color.rgb = SECONDARY

    desc_p = doc.add_paragraph()
    desc_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    desc_p.paragraph_format.space_before = Pt(0)
    desc_p.paragraph_format.space_after = Pt(24)
    run_desc = desc_p.add_run("Comprehensive test execution manual covering all platform features across Super Admin, Admin, Organizer, and Attendee/Customer roles (including PayPro Online Gateway & Direct Bank Transfer).")
    run_desc.font.size = Pt(11)
    run_desc.font.italic = True

    # Horizontal Divider Line
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(18)
    p_div_run = p_div.add_run("_________________________________________________________________________________")
    p_div_run.font.color.rgb = RGBColor(203, 213, 225)

    # -------------------------------------------------------------
    # SECTION 1: OVERVIEW & PREREQUISITES
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("1. Document Overview & Environment Setup")
    r1.font.color.rgb = PRIMARY
    r1.font.bold = True

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.add_run("This manual provides a zero-to-hero, step-by-step procedure to test the entire ")
    r_bold = p.add_run("EventLand")
    r_bold.bold = True
    p.add_run(" ticketing and event management ecosystem from scratch. It verifies core business logic including user role authorization, interactive seat reservations, SignalR real-time locks, PayPro 1Pay instant online payment gateway checkout, direct bank transfer manual verification, autonomous 30-minute hold expiration, and digital E-Ticket QR code issuance.")

    add_callout(doc, 
                "Before starting test execution, ensure both backend API (.NET 10 Web API) and frontend SPA (React + Vite) are running locally or pointed to the active staging environment. PayPro demo API credentials are configured in appsettings.Development.json.", 
                title="PREREQUISITE CHECK:", 
                bg_hex="EFF6FF", 
                border_hex="2563EB")

    # Table of Environment details
    doc.add_heading("System Environment & Default Test Accounts", level=2)
    
    tbl_env = doc.add_table(rows=5, cols=3)
    tbl_env.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_env)

    headers = ["Role / Component", "URL / Access Details", "Default Credentials / Notes"]
    for i, h_text in enumerate(headers):
        cell = tbl_env.cell(0, i)
        set_cell_background(cell, "1E1B4B")
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    env_data = [
        ("Super Admin", "http://localhost:5173 (Admin Portal)", "admin@eventland.pk / SuperAdmin123!"),
        ("Admin", "http://localhost:5173 (Admin Portal)", "Created via SuperAdmin User Portal"),
        ("Organizer", "http://localhost:5173 (Organizer Portal)", "organizer.qa@eventland.pk or Self-Register"),
        ("Attendee / Customer", "http://localhost:5173 (Public Web App)", "Guest or Self-Registered Customer Account")
    ]

    for row_idx, data in enumerate(env_data, start=1):
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(data):
            cell = tbl_env.cell(row_idx, col_idx)
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.size = Pt(10)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # SECTION 2: SUPER ADMIN TESTING
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("2. Super Admin Role - System Initialization & Governance")
    r1.font.color.rgb = PRIMARY
    r1.font.bold = True

    p = doc.add_paragraph()
    p.add_run("The Super Admin holds supreme authority over the EventLand platform. Responsibilities include system security, global role assignments, active bank account management, bank downtime maintenance locks, locations (countries/cities), FAQs, and global audit.")

    # Test Case 1.1
    doc.add_heading("Test Case 1.1: Super Admin Authentication & Initial Login", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Open the application at ").font.size = Pt(10.5)
    p.add_run("http://localhost:5173").bold = True
    p.add_run(".\n2. Click ").font.size = Pt(10.5)
    p.add_run("Login / Register").bold = True
    p.add_run(" in the header navigation bar.\n3. Enter Email: ").font.size = Pt(10.5)
    p.add_run("admin@eventland.pk").bold = True
    p.add_run(" and Password: ").font.size = Pt(10.5)
    p.add_run("SuperAdmin123!").bold = True
    p.add_run(".\n4. Click ").font.size = Pt(10.5)
    p.add_run("Sign In").bold = True
    p.add_run(".")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("JWT token issued, user authenticated, navbar displays 'Admin Portal' link and Super Admin badge. Local storage stores active session token securely.")

    # Test Case 1.2
    doc.add_heading("Test Case 1.2: System Active Bank Account & Maintenance Notice Setup", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Navigate to ").font.size = Pt(10.5)
    p.add_run("Admin Portal -> Bank Accounts").bold = True
    p.add_run(".\n2. Click ").font.size = Pt(10.5)
    p.add_run("Add / Edit Active Bank Account").bold = True
    p.add_run(".\n3. Enter Bank Name (e.g. ").font.size = Pt(10.5)
    p.add_run("United Bank Limited - UBL").bold = True
    p.add_run("), Account Title (e.g. ").font.size = Pt(10.5)
    p.add_run("Event Land Official Pvt Ltd").bold = True
    p.add_run("), Account Number, IBAN, and Branch Code.\n4. Upload Official Bank QR Code image file.\n5. Toggle ").font.size = Pt(10.5)
    p.add_run("Is Maintenance Mode").bold = True
    p.add_run(" to ON to test the maintenance lockout banner on public checkout, then toggle back to OFF.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Bank account details saved in DB table 'BankAccounts'. Endpoint '/api/bank-accounts/active' returns updated details. When maintenance mode is active, public checkout displays advisory banner and locks ticket selection.")

    # Test Case 1.3
    doc.add_heading("Test Case 1.3: User Management & Role Promotion (Admin & Organizer Creation)", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Navigate to ").font.size = Pt(10.5)
    p.add_run("Admin Portal -> Users & Roles").bold = True
    p.add_run(".\n2. Click ").font.size = Pt(10.5)
    p.add_run("Create User").bold = True
    p.add_run(".\n3. Create an Admin account: Email ").font.size = Pt(10.5)
    p.add_run("admin.qa@eventland.pk").bold = True
    p.add_run(", Role ").font.size = Pt(10.5)
    p.add_run("Admin").bold = True
    p.add_run(".\n4. Create an Organizer account: Email ").font.size = Pt(10.5)
    p.add_run("organizer.qa@eventland.pk").bold = True
    p.add_run(", Role ").font.size = Pt(10.5)
    p.add_run("Organizer").bold = True
    p.add_run(".\n5. Test Account Lockout: Attempt 5 incorrect logins for a user to verify 15-minute temporary lockout enforcement.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Users created with unique email & phone validations. Password complexity rules enforced. Account lockout engages after 5 failed attempts.")

    # Test Case 1.4
    doc.add_heading("Test Case 1.4: Location (Countries & Cities) & Metadata Management", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Navigate to ").font.size = Pt(10.5)
    p.add_run("Admin Portal -> Countries & Cities").bold = True
    p.add_run(".\n2. Add Country ").font.size = Pt(10.5)
    p.add_run("Pakistan (Code: PK, Dial Code: +92)").bold = True
    p.add_run(".\n3. Add Cities: ").font.size = Pt(10.5)
    p.add_run("Karachi, Lahore, Islamabad").bold = True
    p.add_run(".\n4. Navigate to ").font.size = Pt(10.5)
    p.add_run("Tags / Categories").bold = True
    p.add_run(" and ensure tags (Concerts, Theatre, Comedy, Festivals) are active.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Countries and cities seeded and available for event venue assignments and homepage city filter dropdowns.")

    # -------------------------------------------------------------
    # SECTION 3: ADMIN TESTING
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("3. Admin Role - Platform Operations & Venue Management")
    r1.font.color.rgb = PRIMARY
    r1.font.bold = True

    p = doc.add_paragraph()
    p.add_run("Admins manage platform venues, auditorium layouts, seating zones, artist profiles, event approvals, bank payment verification, and order processing.")

    doc.add_heading("Test Case 2.1: Venue & Interactive Auditorium Layout Configuration", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Log in as Admin (").font.size = Pt(10.5)
    p.add_run("admin.qa@eventland.pk").bold = True
    p.add_run(").\n2. Go to ").font.size = Pt(10.5)
    p.add_run("Admin Portal -> Venues & Layouts").bold = True
    p.add_run(".\n3. Create Venue: Name ").font.size = Pt(10.5)
    p.add_run("Arts Council Karachi").bold = True
    p.add_run(", City ").font.size = Pt(10.5)
    p.add_run("Karachi").bold = True
    p.add_run(".\n4. Add Auditorium: ").font.size = Pt(10.5)
    p.add_run("Main Auditorium").bold = True
    p.add_run(".\n5. Add Seating Zones: Create ").font.size = Pt(10.5)
    p.add_run("VIP Zone (Rows A-C, 15 seats/row)").bold = True
    p.add_run(" and ").font.size = Pt(10.5)
    p.add_run("Executive Zone (Rows D-J, 20 seats/row)").bold = True
    p.add_run(".")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Auditorium layout and seat grid generated in DB. Seats assigned unique row/number identifiers.")

    doc.add_heading("Test Case 2.2: Artist Profile Management", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Navigate to ").font.size = Pt(10.5)
    p.add_run("Admin Portal -> Artists").bold = True
    p.add_run(".\n2. Click ").font.size = Pt(10.5)
    p.add_run("Add New Artist").bold = True
    p.add_run(".\n3. Enter Artist Name (e.g. ").font.size = Pt(10.5)
    p.add_run("Atif Aslam").bold = True
    p.add_run("), Bio, social links, and upload Artist Profile Photo.\n4. Save Artist record.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Artist record stored and available for linking to concert events.")

    doc.add_heading("Test Case 2.3: Global Event Publishing & SEO Slug Generation", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Navigate to ").font.size = Pt(10.5)
    p.add_run("Admin Portal -> Events").bold = True
    p.add_run(".\n2. Create/Edit Event: Title ").font.size = Pt(10.5)
    p.add_run("Atif Aslam Live in Concert 2026").bold = True
    p.add_run(".\n3. Select Category: ").font.size = Pt(10.5)
    p.add_run("Concerts").bold = True
    p.add_run(", Venue: ").font.size = Pt(10.5)
    p.add_run("Arts Council Karachi").bold = True
    p.add_run(".\n4. Set Event Show Date/Time, set Ticket Tiers (e.g. VIP: PKR 5,000; Executive: PKR 2,500).\n5. Set Status to ").font.size = Pt(10.5)
    p.add_run("Published").bold = True
    p.add_run(".")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Event saved with SEO URL slug (e.g., '/event/atif-aslam-live-in-concert-2026-1001'). Event visible on public homepage search.")

    # -------------------------------------------------------------
    # SECTION 4: ORGANIZER TESTING
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("4. Organizer Role - Event Creation & Sales Analytics")
    r1.font.color.rgb = PRIMARY
    r1.font.bold = True

    p = doc.add_paragraph()
    p.add_run("Organizers can host events, set up ticket tiers, view dedicated sales reports, and manage attendee lists for their own events.")

    doc.add_heading("Test Case 3.1: Self-Service Event Creation Wizard", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Log in as Organizer (").font.size = Pt(10.5)
    p.add_run("organizer.qa@eventland.pk").bold = True
    p.add_run(").\n2. Click ").font.size = Pt(10.5)
    p.add_run("List Your Event").bold = True
    p.add_run(" or open ").font.size = Pt(10.5)
    p.add_run("Organizer Dashboard -> Create Event").bold = True
    p.add_run(".\n3. Step 1 (Basic Details): Title, Description, City, Category Tag.\n4. Step 2 (Schedule): Event Start Date & Time, Show Schedule.\n5. Step 3 (Ticket Tiers & Seating): Define Ticket Tiers & max ticket count per user.\n6. Step 4 (Media Upload): Upload Banner image, Poster, and Artist profile photo.\n7. Submit Event.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Event created under Organizer ownership. Linked exclusively to the organizer ID.")

    doc.add_heading("Test Case 3.2: BOLA / IDOR Authorization Security Defenses", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Logged in as Organizer A, capture an Event ID owned by Admin or Organizer B.\n2. Attempt to invoke edit or delete API endpoints (e.g. ").font.size = Pt(10.5)
    p.add_run("PUT /api/admin/events/{other_event_id}").bold = True
    p.add_run(") or edit via UI.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Backend rejects request with 403 Forbidden ('Unauthorized access to event'). Organizers are strictly constrained to their own events.")

    add_callout(doc, 
                "Single-query SQL-level authorization scoping prevents broken object level authorization (BOLA) by appending organizerId check to all DB query filters.", 
                title="SECURITY HARDENING RULE:", 
                bg_hex="FEF2F2", 
                border_hex="DC2626")

    doc.add_heading("Test Case 3.3: Organizer Sales & Booking Analytics Dashboard", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Open ").font.size = Pt(10.5)
    p.add_run("Organizer Dashboard").bold = True
    p.add_run(".\n2. View Overview Analytics: Total Revenue, Tickets Sold, Total Views, Sales by Tier.\n3. Click ").font.size = Pt(10.5)
    p.add_run("Artist Bookings").bold = True
    p.add_run(" tab to review artist schedules.\n4. Click ").font.size = Pt(10.5)
    p.add_run("Export Attendee List").bold = True
    p.add_run(" to download booking records.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Analytics calculations reflect exact DB totals for owned events only.")

    # -------------------------------------------------------------
    # SECTION 5: ATTENDEE TESTING
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("5. Attendee Role - Discovery, Hold, PayPro Gateway & Direct Bank Transfer")
    r1.font.color.rgb = PRIMARY
    r1.font.bold = True

    p = doc.add_paragraph()
    p.add_run("Attendees discover events, interact with live seating maps, lock seats with 30-minute holds, complete PayPro 1Pay online payments or bank transfers, and download scannable E-Tickets.")

    doc.add_heading("Test Case 4.1: Homepage Discovery, Search & Category Filters", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Access public homepage.\n2. Filter events by City (e.g. ").font.size = Pt(10.5)
    p.add_run("Karachi").bold = True
    p.add_run("), Category (e.g. ").font.size = Pt(10.5)
    p.add_run("Concerts").bold = True
    p.add_run("), and Search Query (e.g. ").font.size = Pt(10.5)
    p.add_run("Atif").bold = True
    p.add_run(").\n3. Click on event card to navigate to SEO detail page.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Filtered events update dynamically. Event detail page renders slug URL cleanly.")

    doc.add_heading("Test Case 4.2: Interactive Seat Selection & Real-Time SignalR Locks", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Open Event Detail page and click ").font.size = Pt(10.5)
    p.add_run("Select Seats").bold = True
    p.add_run(".\n2. In Browser 1, click to select Seat ").font.size = Pt(10.5)
    p.add_run("A-5 (VIP)").bold = True
    p.add_run(".\n3. Simultaneously open the same event seating map in Browser 2 (Incognito window).\n4. Observe Seat A-5 status in Browser 2.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("SignalR hub '/hubs/seating' broadcasts lock instantly. Browser 2 displays Seat A-5 as 'Reserved/Held' in real-time.")

    doc.add_heading("Test Case 4.3: 30-Minute Hold & Booking Reference Generation", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Click ").font.size = Pt(10.5)
    p.add_run("Proceed to Checkout").bold = True
    p.add_run(".\n2. System generates unique booking reference code (e.g. ").font.size = Pt(10.5)
    p.add_run("EVL-894215").bold = True
    p.add_run(").\n3. Checkout modal displays a 30-minute countdown timer (").font.size = Pt(10.5)
    p.add_run("PaymentExpiresAt").bold = True
    p.add_run(").")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Booking record created in DB with status 'Pending'. Timer decrements accurately.")

    doc.add_heading("Test Case 4.4: PayPro 1Pay Instant Online Gateway Checkout", level=2)
    p = doc.add_paragraph()
    p.add_run("1. In Step 2 of Checkout Modal, select ").font.size = Pt(10.5)
    p.add_run("PayPro Online Gateway ⚡").bold = True
    p.add_run(".\n2. Choose payment channel (").font.size = Pt(10.5)
    p.add_run("EasyPaisa / JazzCash / Cards").bold = True
    p.add_run(" or ").font.size = Pt(10.5)
    p.add_run("PayPro Instant QR Code").bold = True
    p.add_run(").\n3. Click ").font.size = Pt(10.5)
    p.add_run("Proceed to PayPro Online Gateway →").bold = True
    p.add_run(".\n4. System calls ").font.size = Pt(10.5)
    p.add_run("POST /api/payments/paypro/checkout").bold = True
    p.add_run(" using PayPro demo API credentials from ").font.size = Pt(10.5)
    p.add_run("appsettings.Development.json").bold = True
    p.add_run(".")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("PayPro Consumer Voucher / OTC Number generated. Direct 'Pay Online via PayPro 1Pay Portal' button displayed, allowing instant online payment.")

    doc.add_heading("Test Case 4.5: Direct Bank Transfer Checkout & Payment Proof Submission", level=2)
    p = doc.add_paragraph()
    p.add_run("1. In Step 2, select ").font.size = Pt(10.5)
    p.add_run("Direct Bank Transfer 🏛️").bold = True
    p.add_run(".\n2. Review active Bank Account details on ").font.size = Pt(10.5)
    p.add_run("CheckoutModal.jsx").bold = True
    p.add_run(" (UBL Bank, Account Title, IBAN, UBL QR Code).\n3. ").font.size = Pt(10.5)
    p.add_run("Test Path A (File Upload): ").bold = True
    p.add_run("Upload payment receipt screenshot image (type=slip).\n4. ").font.size = Pt(10.5)
    p.add_run("Test Path B (Screenshot Block Fallback): ").bold = True
    p.add_run("Enter Sender Account Title (e.g. 'Muhammad Ali'), Sender Bank Name ('Standard Chartered'), Sender Account Last 4 Digits ('4821').\n5. Click ").font.size = Pt(10.5)
    p.add_run("Submit Payment Proof").bold = True
    p.add_run(".")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Payment proof saved. Booking status updates to 'PendingVerification'. Customer receives confirmation dialog.")

    doc.add_heading("Test Case 4.6: Autonomous 30-Minute Hold Expiration (Negative Test)", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Place a seat hold for a booking.\n2. Do NOT complete payment.\n3. Allow 30 minutes to elapse (or trigger ").font.size = Pt(10.5)
    p.add_run("PendingBookingExpiryService").bold = True
    p.add_run(" background worker execution).")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Background service auto-cancels booking, marks status as 'Expired', decrements sold count, and returns seats to 'Available' pool.")

    # -------------------------------------------------------------
    # SECTION 6: VERIFICATION & TICKET ISSUANCE
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("6. Payment Verification & E-Ticket Issuance Lifecycle")
    r1.font.color.rgb = PRIMARY
    r1.font.bold = True

    doc.add_heading("Test Case 5.1: Admin Review of Unpaid Invoices & Payment Proofs", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Log in as Admin/SuperAdmin.\n2. Open ").font.size = Pt(10.5)
    p.add_run("Admin Portal -> Unpaid Payment Invoices").bold = True
    p.add_run(" modal.\n3. Locate booking reference ").font.size = Pt(10.5)
    p.add_run("EVL-894215").bold = True
    p.add_run(".\n4. Inspect uploaded payment slip image or verify fallback bank sender details.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Payment proof details display accurately with high-resolution image preview.")

    doc.add_heading("Test Case 5.2: Payment Approval, Seat Confirmation & Digital QR E-Ticket", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Click ").font.size = Pt(10.5)
    p.add_run("Confirm & Issue E-Ticket").bold = True
    p.add_run(".\n2. Booking status updates to ").font.size = Pt(10.5)
    p.add_run("Paid / Confirmed").bold = True
    p.add_run(".\n3. Seats permanently update from 'Reserved' to 'Booked'.\n4. Confirmation email and WhatsApp share link generated.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("Digital E-Ticket pass generated with unique scannable QR Code.")

    doc.add_heading("Test Case 5.3: Attendee Digital E-Ticket Viewing & Gate Validation", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Log in as Attendee.\n2. Go to ").font.size = Pt(10.5)
    p.add_run("Attendee Dashboard -> My Bookings").bold = True
    p.add_run(".\n3. Click ").font.size = Pt(10.5)
    p.add_run("View Digital E-Ticket").bold = True
    p.add_run(".\n4. Inspect ").font.size = Pt(10.5)
    p.add_run("DigitalTicketModal.jsx").bold = True
    p.add_run(" for QR code, booking reference, seat numbers, and venue address.")

    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.left_indent = Inches(0.25)
    p_exp.add_run("Expected Result: ").bold = True
    p_exp.add_run("E-Ticket displays crisp QR Code, event metadata, and ticket tier validation pass.")

    # -------------------------------------------------------------
    # SECTION 7: FULL QA TEST MATRIX SUMMARY
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("7. Complete QA Verification Matrix Checklist")
    r1.font.color.rgb = PRIMARY
    r1.font.bold = True

    p = doc.add_paragraph()
    p.add_run("Use this structured execution checklist to log QA test runs across all roles:")

    tbl_matrix = doc.add_table(rows=17, cols=5)
    tbl_matrix.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_matrix)

    m_headers = ["ID", "Target Role", "Feature Under Test", "Key Verification Criteria", "Status"]
    for i, h_text in enumerate(m_headers):
        cell = tbl_matrix.cell(0, i)
        set_cell_background(cell, "1E1B4B")
        set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    matrix_rows = [
        ("TC-1.1", "Super Admin", "Authentication & JWT", "Login succeeds, Admin Portal link rendered", "[  ] Pass"),
        ("TC-1.2", "Super Admin", "Bank Account Setup", "Active bank saved, maintenance mode toggle works", "[  ] Pass"),
        ("TC-1.3", "Super Admin", "User & Role Management", "Promote roles, password rules & lockout verified", "[  ] Pass"),
        ("TC-1.4", "Super Admin", "Locations & Metadata", "Countries, Cities, FAQs & Tags managed", "[  ] Pass"),
        ("TC-2.1", "Admin", "Venue & Layout Config", "Auditorium & Seating zones created with seat grid", "[  ] Pass"),
        ("TC-2.2", "Admin", "Artist Management", "Artist bio and photo uploaded and saved", "[  ] Pass"),
        ("TC-2.3", "Admin", "Event Publishing", "Event published with clean SEO URL slug", "[  ] Pass"),
        ("TC-3.1", "Organizer", "Event Creation Wizard", "Multi-step wizard completes event registration", "[  ] Pass"),
        ("TC-3.2", "Organizer", "BOLA / IDOR Defense", "Foreign event edits blocked with 403 Forbidden", "[  ] Pass"),
        ("TC-3.3", "Organizer", "Sales Analytics", "Total sales & revenue match DB counts", "[  ] Pass"),
        ("TC-4.1", "Attendee", "Discovery & Search", "City, Category & Search filters update list", "[  ] Pass"),
        ("TC-4.2", "Attendee", "SignalR Live Seat Lock", "Seat locked in real-time across multiple browsers", "[  ] Pass"),
        ("TC-4.3", "Attendee", "30-Min Seat Hold", "EVL reference generated & countdown active", "[  ] Pass"),
        ("TC-4.4", "Attendee", "PayPro Online Gateway", "PayPro 1Pay voucher generated & 1Pay portal link active", "[  ] Pass"),
        ("TC-4.5", "Attendee", "Bank Transfer Checkout", "Proof image or bank fallback details submitted", "[  ] Pass"),
        ("TC-4.6", "Attendee", "Hold Expiration", "Expired holds auto-cancel and return seats to pool", "[  ] Pass"),
    ]

    for row_idx, data in enumerate(matrix_rows, start=1):
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(data):
            cell = tbl_matrix.cell(row_idx, col_idx)
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(18)

    output_path = r"e:\EventLand\EventLand_Full_Role_Testing_Guide.docx"
    doc.save(output_path)
    print(f"Successfully generated Word document at: {output_path}")

if __name__ == "__main__":
    build_document()
